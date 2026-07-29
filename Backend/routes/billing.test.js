const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

jest.mock('jsonwebtoken');

jest.mock('googleapis', () => {
  const mockGet = jest.fn();
  return {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({})),
        OAuth2: jest.fn().mockImplementation(() => ({
          verifyIdToken: jest.fn().mockResolvedValue({
            getPayload: () => ({ email: 'pubsub@test.iam.gserviceaccount.com', email_verified: true }),
          }),
        })),
      },
      androidpublisher: jest.fn(() => ({
        purchases: { subscriptions: { get: mockGet } },
      })),
      __mockGet: mockGet,
    },
  };
});

const { google } = require('googleapis');

function createApp(pool) {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'x', private_key: 'k' });
  process.env.GOOGLE_PACKAGE_NAME = 'com.test';
  process.env.GOOGLE_RTDN_AUDIENCE = 'https://fitscan.test/billing/webhook';
  process.env.GOOGLE_RTDN_SERVICE_ACCOUNT = 'pubsub@test.iam.gserviceaccount.com';
  const billingRouter = require('./billing');
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = pool; next(); });
  app.use('/billing', billingRouter);
  return app;
}

describe('Billing Routes', () => {
  let pool, app;

  beforeEach(() => {
    pool = { query: jest.fn().mockResolvedValue({}) };
    app = createApp(pool);
    jest.clearAllMocks();
    jwt.verify.mockReturnValue({ userId: 1 });
  });

  describe('POST /billing/validate', () => {
    it('returns 400 when missing purchase token', async () => {
      const res = await request(app).post('/billing/validate').set('Cookie', 'token=valid').send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 when missing product ID', async () => {
      const res = await request(app).post('/billing/validate').set('Cookie', 'token=valid')
        .send({ transaction: { purchaseToken: 'purchase_token_123' } });
      expect(res.status).toBe(400);
    });

    it('returns 400 when subscription expired', async () => {
      google.__mockGet.mockResolvedValue({ data: { expiryTimeMillis: '1000' } });
      const res = await request(app).post('/billing/validate').set('Cookie', 'token=valid').send({
        id: 'prod1',
        transaction: { purchaseToken: 'purchase_token_123' },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });

    it('returns success for valid subscription', async () => {
      const future = (Date.now() + 1000000).toString();
      google.__mockGet.mockResolvedValue({ data: { expiryTimeMillis: future } });
      const res = await request(app).post('/billing/validate').set('Cookie', 'token=valid').send({
        id: 'prod1',
        transaction: { purchaseToken: 'purchase_token_123' },
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('POST /billing/webhook', () => {
    it('processes subscription notification', async () => {
      const notification = {
        subscriptionNotification: {
          purchaseToken: 'purchase_token_123',
          subscriptionId: 'sub1',
          notificationType: 2,
        },
      };
      const encoded = Buffer.from(JSON.stringify(notification)).toString('base64');
      google.__mockGet.mockResolvedValue({ data: { expiryTimeMillis: '9999999999999' } });
      pool.query
        .mockResolvedValueOnce({ rows: [{ event_id: 'msg-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, profile: {} }] })
        .mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/billing/webhook')
        .set('Authorization', 'Bearer google-oidc-token')
        .send({ message: { messageId: 'msg-1', data: encoded } });
      expect(res.status).toBe(200);
    });
  });
});
