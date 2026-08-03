const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

jest.mock('jsonwebtoken');

// Echo the requested amount back so tests can assert the server charged the
// catalogue price rather than anything the client asked for.
const mockCreateOrder = jest.fn((opts) => Promise.resolve({
  id: 'order_123',
  amount: opts.amount,
  currency: opts.currency,
}));
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockCreateOrder },
  }));
});

const paymentRouter = require('./payment');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = mockPool; next(); });
  app.use('/api/payment', paymentRouter);
  return app;
}

let mockPool;
const originalEnv = process.env;

beforeEach(() => {
  mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
  jwt.verify.mockReturnValue({ userId: 1 });
  mockCreateOrder.mockClear();
  process.env = { ...originalEnv, RAZORPAY_KEY_ID: 'key_test', RAZORPAY_KEY_SECRET: 'secret_test', JWT_SECRET: 'jwt_secret' };
});

afterEach(() => { process.env = originalEnv; });

describe('GET /api/payment/plans', () => {
  it('returns all four tiers for an account that has never paid', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .get('/api/payment/plans')
      .set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(res.body.plans.map((p) => p.id)).toEqual(
      expect.arrayContaining(['trial7', 'monthly', 'yearly', 'lifetime']),
    );
  });

  it('hides the first-purchase-only tier once the account has paid', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ 1: 1 }] });
    const res = await request(createApp())
      .get('/api/payment/plans')
      .set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    const ids = res.body.plans.map((p) => p.id);
    expect(ids).not.toContain('trial7');
    expect(ids).toContain('lifetime');
  });

  it('prices the lifetime tier at 15000 INR with no expiry', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .get('/api/payment/plans')
      .set('Cookie', 'token=valid');
    const lifetime = res.body.plans.find((p) => p.id === 'lifetime');
    expect(lifetime.amount).toBe(1500000);
    expect(lifetime.durationDays).toBeNull();
  });
});

describe('POST /api/payment/create-order', () => {
  it('returns order details', async () => {
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid')
      .send({ planId: 'monthly' });
    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe('order_123');
    expect(res.body.key_id).toBe('key_test');
  });

  it('charges the server catalogue price for each plan', async () => {
    const expected = { trial7: 5000, monthly: 49900, yearly: 480000, lifetime: 1500000 };
    for (const [planId, amount] of Object.entries(expected)) {
      mockPool.query.mockResolvedValue({ rows: [] });
      const res = await request(createApp())
        .post('/api/payment/create-order')
        .set('Cookie', 'token=valid')
        .send({ planId });
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(amount);
    }
  });

  it('ignores a client-supplied amount', async () => {
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid')
      .send({ planId: 'lifetime', amount: 100 });
    // Strict schema rejects the extra key outright rather than silently
    // dropping it, so a tampered request never reaches Razorpay.
    expect(res.status).toBe(400);
  });

  it('rejects an unknown plan', async () => {
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid')
      .send({ planId: 'free_forever' });
    expect(res.status).toBe(400);
  });

  it('rejects the intro tier when the account already paid', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ 1: 1 }] });
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid')
      .send({ planId: 'trial7' });
    expect(res.status).toBe(409);
  });

  it('returns 401 without token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .send({ planId: 'monthly' });
    expect(res.status).toBe(401);
  });

  it('returns 500 when keys not configured', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid')
      .send({ planId: 'monthly' });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/payment/verify', () => {
  it('requires Play Integrity before verification when production enforcement is enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED = 'true';
    process.env.JWT_SECRET = 'production-test-jwt-secret-at-least-32-characters';

    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'signature',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAY_INTEGRITY_REQUIRED');
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('verifies payment and updates user', async () => {
    const signature = crypto.createHmac('sha256', 'secret_test').update('order_1|pay_1').digest('hex');
    mockPool.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ user_id: 1, status: 'created', plan_id: 'monthly' }] })
      .mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('grants the duration recorded on the order, not a fixed 30 days', async () => {
    const signature = crypto.createHmac('sha256', 'secret_test').update('order_1|pay_1').digest('hex');
    mockPool.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ user_id: 1, status: 'created', plan_id: 'yearly' }] })
      .mockResolvedValue({ rows: [] });
    await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });

    const update = mockPool.query.mock.calls.find(([sql]) => sql.includes('SET is_premium = true'));
    expect(update[1]).toEqual(expect.arrayContaining(['yearly', 365]));
  });

  it('grants a null expiry for the lifetime plan', async () => {
    const signature = crypto.createHmac('sha256', 'secret_test').update('order_1|pay_1').digest('hex');
    mockPool.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ user_id: 1, status: 'created', plan_id: 'lifetime' }] })
      .mockResolvedValue({ rows: [] });
    await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });

    const update = mockPool.query.mock.calls.find(([sql]) => sql.includes('SET is_premium = true'));
    expect(update[1]).toEqual(expect.arrayContaining(['lifetime', null]));
  });

  it('falls back to monthly for legacy orders with no plan_id', async () => {
    const signature = crypto.createHmac('sha256', 'secret_test').update('order_1|pay_1').digest('hex');
    mockPool.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ user_id: 1, status: 'created', plan_id: null }] })
      .mockResolvedValue({ rows: [] });
    await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });

    const update = mockPool.query.mock.calls.find(([sql]) => sql.includes('SET is_premium = true'));
    expect(update[1]).toEqual(expect.arrayContaining(['monthly', 30]));
  });

  it('returns 400 for invalid signature', async () => {
    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: '0'.repeat(64) });
    expect(res.status).toBe(400);
  });

  it('rejects a valid payment for an order owned by another account', async () => {
    const signature = crypto.createHmac('sha256', 'secret_test').update('order_1|pay_1').digest('hex');
    mockPool.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ user_id: 999, status: 'created', plan_id: 'monthly' }] })
      .mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });
    expect(res.status).toBe(403);
  });

  it('returns 500 when secret not configured', async () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: '0'.repeat(64) });
    expect(res.status).toBe(500);
  });
});
