cordova.define("cordova-plugin-fitscore-play-integrity.PlayIntegrity", function(require, exports, module) {
'use strict';

const exec = require('cordova/exec');
const { buildRequestHash } = require('cordova-plugin-fitscore-play-integrity.requestHash');

const PROTECTED_PATHS = new Map([
  ['/api/payment/verify', 'razorpay_verify'],
  ['/api/subscriptions/revenuecat/sync', 'revenuecat_sync'],
]);

let configurationPromise;

function execPromise(action, args = []) {
  return new Promise((resolve, reject) => {
    exec(resolve, reject, 'FitScorePlayIntegrity', action, args);
  });
}

function getConfiguration() {
  if (!configurationPromise) {
    configurationPromise = execPromise('getConfiguration').catch((error) => {
      configurationPromise = null;
      throw error;
    });
  }
  return configurationPromise;
}

async function requestToken(action, requestData = {}) {
  const requestHash = await buildRequestHash(action, requestData);
  const integrityToken = await execPromise('requestToken', [requestHash]);
  return { integrityToken, requestHash };
}

function parseJsonBody(body) {
  if (typeof body !== 'string') return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function installFetchInterceptor() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (window.__fitScorePlayIntegrityFetchInstalled) return;

  window.__fitScorePlayIntegrityFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    if (!rawUrl) return originalFetch(input, init);

    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch (_error) {
      return originalFetch(input, init);
    }

    const action = PROTECTED_PATHS.get(url.pathname);
    const method = String(init.method || input?.method || 'GET').toUpperCase();
    if (!action || method !== 'POST') return originalFetch(input, init);

    try {
      const configuration = await getConfiguration();
      const allowedOrigins = Array.isArray(configuration?.allowedOrigins)
        ? configuration.allowedOrigins
        : [];
      if (!allowedOrigins.includes(url.origin)) return originalFetch(input, init);

      let body = init.body;
      if (body === undefined && typeof Request !== 'undefined' && input instanceof Request) {
        body = await input.clone().text();
      }

      const requestData = parseJsonBody(body);
      if (!requestData) return originalFetch(input, init);
      delete requestData.integrityToken;

      const { integrityToken } = await requestToken(action, requestData);
      const protectedBody = JSON.stringify({ ...requestData, integrityToken });
      const protectedInit = { ...init, body: protectedBody };

      if (typeof Request !== 'undefined' && input instanceof Request) {
        return originalFetch(new Request(input, protectedInit));
      }
      return originalFetch(input, protectedInit);
    } catch (error) {
      // The backend feature flag decides whether absence of a token blocks the
      // action. Development and test flows therefore remain usable, while a
      // production deployment with enforcement enabled fails closed server-side.
      console.warn('[PlayIntegrity] token request failed:', error?.message || error);
      return originalFetch(input, init);
    }
  };
}

const api = { getConfiguration, installFetchInterceptor, requestToken };
installFetchInterceptor();

module.exports = api;

});
