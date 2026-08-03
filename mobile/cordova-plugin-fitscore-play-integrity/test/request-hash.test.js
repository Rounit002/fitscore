'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { buildRequestHash, stableStringify } = require('../www/request-hash');

test('stableStringify sorts object keys recursively', () => {
  const first = { z: 1, nested: { b: true, a: ['x', 2] } };
  const second = { nested: { a: ['x', 2], b: true }, z: 1 };
  assert.equal(stableStringify(first), stableStringify(second));
});

test('request hash is deterministic, URL-safe, and action-bound', async () => {
  const body = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1' };
  const first = await buildRequestHash('razorpay_verify', body, webcrypto);
  const reordered = await buildRequestHash(
    'razorpay_verify',
    { razorpay_payment_id: 'pay_1', razorpay_order_id: 'order_1' },
    webcrypto,
  );
  const otherAction = await buildRequestHash('revenuecat_sync', body, webcrypto);

  assert.equal(first, reordered);
  assert.notEqual(first, otherAction);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
});
