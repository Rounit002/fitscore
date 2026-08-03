'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { webcrypto } = require('node:crypto');
const requestHash = require('../www/request-hash');

const pluginModulePath = require.resolve('../www/play-integrity');

function loadPlugin(t, execStub, fetchStub) {
  const originalLoad = Module._load;
  const originalWindow = global.window;

  global.window = {
    fetch: fetchStub,
    location: { href: 'https://localhost/index.html' },
  };
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'cordova/exec') return execStub;
    if (request === 'cordova-plugin-fitscore-play-integrity.requestHash') return requestHash;
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[pluginModulePath];

  t.after(() => {
    Module._load = originalLoad;
    delete require.cache[pluginModulePath];
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  });

  return require(pluginModulePath);
}

test('injects a request-bound token before Razorpay verification', async (t) => {
  const calls = [];
  const originalFetch = async (...args) => {
    calls.push({ type: 'fetch', args });
    return { ok: true };
  };
  const execStub = (success, _failure, service, action, args) => {
    calls.push({ type: 'exec', service, action, args });
    if (action === 'getConfiguration') {
      success({ allowedOrigins: ['https://fitscore-rqgb.onrender.com'], configured: true });
    } else {
      success('server-decodable-integrity-token');
    }
  };

  loadPlugin(t, execStub, originalFetch);
  const body = {
    razorpay_payment_id: 'pay_1',
    razorpay_order_id: 'order_1',
    razorpay_signature: 'signature',
  };
  await global.window.fetch('https://fitscore-rqgb.onrender.com/api/payment/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const tokenCall = calls.find((call) => call.action === 'requestToken');
  const fetchCall = calls.find((call) => call.type === 'fetch');
  assert.ok(tokenCall);
  assert.equal(tokenCall.service, 'FitScorePlayIntegrity');
  assert.equal(
    tokenCall.args[0],
    await requestHash.buildRequestHash('razorpay_verify', body, webcrypto),
  );
  assert.deepEqual(JSON.parse(fetchCall.args[1].body), {
    ...body,
    integrityToken: 'server-decodable-integrity-token',
  });
});

test('does not attach a token to an unapproved origin', async (t) => {
  const calls = [];
  const originalFetch = async (...args) => {
    calls.push({ type: 'fetch', args });
    return { ok: true };
  };
  const execStub = (success, _failure, _service, action, args) => {
    calls.push({ type: 'exec', action, args });
    if (action === 'getConfiguration') {
      success({ allowedOrigins: ['https://fitscore-rqgb.onrender.com'], configured: true });
    } else {
      success('unexpected-token');
    }
  };

  loadPlugin(t, execStub, originalFetch);
  const init = { method: 'POST', body: JSON.stringify({ appUserId: 'nutriscan_1' }) };
  await global.window.fetch('https://attacker.example/api/subscriptions/revenuecat/sync', init);

  assert.equal(calls.some((call) => call.action === 'requestToken'), false);
  const fetchCall = calls.find((call) => call.type === 'fetch');
  assert.equal(fetchCall.args[1], init);
});
