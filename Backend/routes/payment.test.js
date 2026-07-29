const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

jest.mock('jsonwebtoken');
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn().mockResolvedValue({ id: 'order_123', amount: 24900, currency: 'INR' }) },
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
  process.env = { ...originalEnv, RAZORPAY_KEY_ID: 'key_test', RAZORPAY_KEY_SECRET: 'secret_test', JWT_SECRET: 'jwt_secret' };
});

afterEach(() => { process.env = originalEnv; });

describe('POST /api/payment/create-order', () => {
  it('returns order details', async () => {
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe('order_123');
    expect(res.body.key_id).toBe('key_test');
  });

  it('returns 401 without token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const res = await request(createApp()).post('/api/payment/create-order');
    expect(res.status).toBe(401);
  });

  it('returns 500 when keys not configured', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    const res = await request(createApp())
      .post('/api/payment/create-order')
      .set('Cookie', 'token=valid');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/payment/verify', () => {
  it('verifies payment and updates user', async () => {
    const signature = crypto.createHmac('sha256', 'secret_test').update('order_1|pay_1').digest('hex');
    mockPool.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ user_id: 1, status: 'created' }] })
      .mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Cookie', 'token=valid')
      .send({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: signature });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPool.query).toHaveBeenCalled();
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
      .mockResolvedValueOnce({ rows: [{ user_id: 999, status: 'created' }] })
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
