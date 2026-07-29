const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => (req, res, next) => { req.userId = 1; next(); });
jest.mock('../utils/ownershipCheck', () => ({
  requireOwnership: jest.fn(),
}));

const { requireOwnership } = require('../utils/ownershipCheck');
const userRouter = require('./user');

function createApp() {
  const app = express();
  app.use((req, res, next) => { req.pool = mockPool; next(); });
  app.use('/api/user', userRouter);
  return app;
}

let mockPool;

beforeEach(() => {
  mockPool = { query: jest.fn() };
  requireOwnership.mockReset();
});

describe('GET /api/user/scan-quota', () => {
  it('returns quota data for free user (capped at 5)', async () => {
    // Free user: even if scan_limit column says 20, the endpoint returns 5
    mockPool.query.mockResolvedValue({ rows: [{ scans_used: 3, scan_limit: 20, plan: 'free', plan_expires_at: null }] });
    const res = await request(createApp()).get('/api/user/scan-quota');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ used: 3, limit: 5, plan: 'free', remaining: 2, isPremium: false, planExpiresAt: null });
  });

  it('returns quota data for premium user (uses stored scan_limit)', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ scans_used: 10, scan_limit: 100, plan: 'premium', plan_expires_at: '2027-01-01' }] });
    const res = await request(createApp()).get('/api/user/scan-quota');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ used: 10, limit: 100, plan: 'premium', remaining: 90, isPremium: true, planExpiresAt: '2027-01-01' });
  });

  it('returns 404 when user not found', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp()).get('/api/user/scan-quota');
    expect(res.status).toBe(404);
  });

  it('returns 500 on db error', async () => {
    mockPool.query.mockRejectedValue(new Error('db'));
    const res = await request(createApp()).get('/api/user/scan-quota');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/user/:userId/history', () => {
  it('returns scan history', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });
    const res = await request(createApp()).get('/api/user/1/history');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1 }]);
  });

  it('returns 403 when ownership fails', async () => {
    requireOwnership.mockImplementation(() => { const e = new Error('Access denied'); e.status = 403; throw e; });
    const res = await request(createApp()).get('/api/user/99/history');
    expect(res.status).toBe(403);
  });
});

describe('GET /api/user/:userId/quota', () => {
  it('returns quota for owned user', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ scans_used: 2, scan_limit: 10, plan: 'premium', plan_expires_at: '2026-07-01' }] });
    const res = await request(createApp()).get('/api/user/1/quota');
    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(8);
  });

  it('returns 404 when user not found', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp()).get('/api/user/1/quota');
    expect(res.status).toBe(404);
  });
});
