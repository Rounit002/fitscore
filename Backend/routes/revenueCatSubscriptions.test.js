const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('jsonwebtoken');

// Mock global fetch
global.fetch = jest.fn();

function createApp(pool) {
  process.env.REVENUECAT_SECRET_KEY = 'rc_secret';
  process.env.REVENUECAT_WEBHOOK_AUTH = 'Bearer wh_secret';
  process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = 'webhook_signing_secret';
  const router = require('./revenueCatSubscriptions');
  const app = express();
  app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));
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
    process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = 'webhook_signing_secret';
  });

  describe('POST /rc/sync', () => {
    it('requires Play Integrity before entitlement sync when production enforcement is enabled', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      const previousFlag = process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED;
      const previousJwtSecret = process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';
      process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED = 'true';
      process.env.JWT_SECRET = 'production-test-jwt-secret-at-least-32-characters';

      try {
        const res = await request(app)
          .post('/rc/sync')
          .set('Cookie', 'token=valid')
          .send({ appUserId: 'nutriscan_1' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PLAY_INTEGRITY_REQUIRED');
        expect(global.fetch).not.toHaveBeenCalled();
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
        if (previousFlag === undefined) delete process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED;
        else process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED = previousFlag;
        if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousJwtSecret;
      }
    });

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
      pool.query
        .mockResolvedValueOnce({ rows: [{ event_id: 'evt_1' }] })
        .mockResolvedValue({ rows: [] });

      const payload = { event: { id: 'evt_1', app_user_id: 'nutriscan_5' } };
      const rawBody = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto.createHmac('sha256', 'webhook_signing_secret')
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const res = await request(app)
        .post('/rc/webhook')
        .set('Authorization', 'Bearer wh_secret')
        .set('X-RevenueCat-Webhook-Signature', `t=${timestamp},v1=${signature}`)
        .set('Content-Type', 'application/json')
        .send(rawBody);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(pool.query).toHaveBeenCalled();
    });
  });
});
