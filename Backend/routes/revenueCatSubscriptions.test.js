const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

// Mock global fetch
global.fetch = jest.fn();

function createApp(pool) {
  process.env.REVENUECAT_SECRET_KEY = 'rc_secret';
  process.env.REVENUECAT_WEBHOOK_AUTH = 'Bearer wh_secret';
  const router = require('./revenueCatSubscriptions');
  const app = express();
  app.use(express.json());
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = pool; next(); });
  app.use('/rc', router);
  return app;
}

describe('RevenueCat Routes', () => {
  let pool, app;

  beforeEach(() => {
    pool = { query: jest.fn().mockResolvedValue({}) };
    app = createApp(pool);
    jwt.verify.mockReturnValue({ userId: 5 });
    jest.clearAllMocks();
    // Re-set after clearAllMocks
    jwt.verify.mockReturnValue({ userId: 5 });
    process.env.REVENUECAT_SECRET_KEY = 'rc_secret';
    process.env.REVENUECAT_WEBHOOK_AUTH = 'Bearer wh_secret';
  });

  describe('POST /rc/sync', () => {
    it('returns 403 when appUserId mismatches', async () => {
      const res = await request(app)
        .post('/rc/sync')
        .set('Cookie', 'token=valid')
        .send({ appUserId: 'nutriscan_999' });
      expect(res.status).toBe(403);
    });

    it('syncs subscription successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              premium: { expires_date: new Date(Date.now() + 100000).toISOString() },
            },
          },
        }),
      });
      pool.query.mockResolvedValue({});

      const res = await request(app)
        .post('/rc/sync')
        .set('Cookie', 'token=valid')
        .send({ appUserId: 'nutriscan_5' });
      expect(res.status).toBe(200);
      expect(res.body.isPremium).toBe(true);
    });
  });

  describe('POST /rc/webhook', () => {
    it('returns 401 with wrong auth', async () => {
      const res = await request(app)
        .post('/rc/webhook')
        .set('Authorization', 'Bearer wrong')
        .send({ event: { app_user_id: 'nutriscan_5' } });
      expect(res.status).toBe(401);
    });

    it('processes webhook and updates DB', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              premium: { expires_date: new Date(Date.now() + 100000).toISOString() },
            },
          },
        }),
      });
      pool.query.mockResolvedValue({});

      const res = await request(app)
        .post('/rc/webhook')
        .set('Authorization', 'Bearer wh_secret')
        .send({ event: { app_user_id: 'nutriscan_5' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(pool.query).toHaveBeenCalled();
    });
  });
});
