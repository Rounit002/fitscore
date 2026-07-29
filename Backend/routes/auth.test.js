const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Mock profileValidator middleware to pass through
jest.mock('../middleware/profileValidator', () => ({
  validateProfileUpdate: (req, res, next) => { req.validatedBody = req.body; next(); },
  validateDetailsUpdate: (req, res, next) => { req.validatedBody = req.body; next(); },
}));

const authRouter = require('./auth');

function createApp(pool) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = pool; next(); });
  app.use('/auth', authRouter);
  return app;
}

function mockPool() {
  return { query: jest.fn().mockResolvedValue({ rows: [] }) };
}

describe('Auth Routes', () => {
  let pool, app;

  beforeEach(() => {
    pool = mockPool();
    app = createApp(pool);
    jwt.sign.mockReturnValue('tok123');
    jwt.verify.mockReturnValue({ userId: 1 });
  });

  describe('POST /auth/register', () => {
    it('registers successfully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT user
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.co', name: 'A', profile: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null }] }) // INSERT
        .mockResolvedValueOnce({ rows: [{ points: 0, streak: 0, last_login_at: null }] }) // updateStreak SELECT
        .mockResolvedValueOnce({}) // updateStreak UPDATE
        .mockResolvedValueOnce({ rows: [] }) // getMedicalConditions
        .mockResolvedValueOnce({ rows: [] }); // getHealthGoals
      bcrypt.hash.mockResolvedValue('hashed');

      const res = await request(app).post('/auth/register').send({ email: 'a@b.co', password: 'StrongPassword123!', name: 'A' });
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });

    it('returns 409 for duplicate email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app).post('/auth/register').send({ email: 'a@b.co', password: 'StrongPassword123!', name: 'A' });
      expect(res.status).toBe(409);
    });

    it('returns 400 for a password that does not meet policy', async () => {
      const res = await request(app).post('/auth/register').send({ email: 'a@b.co', password: 'short', name: 'A' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when the user is under 13', async () => {
      const currentYear = new Date().getFullYear();
      const res = await request(app).post('/auth/register').send({
        email: 'kid@b.co', password: 'StrongPassword123!', name: 'Kid',
        dateOfBirth: `${currentYear - 8}-01-01`,
      });
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('dateOfBirth');
    });
  });

  describe('POST /auth/login', () => {
    it('logs in successfully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.co', name: 'A', password_hash: 'h', profile: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null, scheduled_deletion_at: null }] })
        .mockResolvedValueOnce({ rows: [{ points: 5, streak: 1, last_login_at: null }] })
        .mockResolvedValueOnce({}) // updateStreak UPDATE
        .mockResolvedValueOnce({ rows: [] }) // conditions
        .mockResolvedValueOnce({ rows: [] }); // goals
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app).post('/auth/login').send({ email: 'a@b.co', password: 'p' });
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });

    it('returns 400 for wrong password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, password_hash: 'h' }] });
      bcrypt.compare.mockResolvedValue(false);
      const res = await request(app).post('/auth/login').send({ email: 'a@b.co', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('returns 400 for user not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).post('/auth/login').send({ email: 'x@y.co', password: 'p' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears cookie and returns success', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('returns user when authenticated', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.c', name: 'A', points: 5, streak: 1, profile: null, scheduled_deletion_at: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null }] })
        .mockResolvedValueOnce({ rows: [] }) // conditions
        .mockResolvedValueOnce({ rows: [] }); // goals

      const res = await request(app).get('/auth/me').set('Cookie', 'token=valid');
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });
  });

  describe('DELETE /auth/account', () => {
    it('schedules account deletion', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, scheduled_deletion_at: null }] })
        .mockResolvedValueOnce({});

      const res = await request(app).delete('/auth/account').set('Cookie', 'token=valid');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /auth/google', () => {
    it('creates new user via google', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT - user not found
        .mockResolvedValueOnce({ rows: [{ id: 2, email: 'g@g.com', name: 'G', profile: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null }] }) // INSERT
        .mockResolvedValueOnce({ rows: [{ points: 0, streak: 0, last_login_at: null }] }) // updateStreak SELECT
        .mockResolvedValueOnce({}) // updateStreak UPDATE
        .mockResolvedValueOnce({ rows: [] }) // conditions
        .mockResolvedValueOnce({ rows: [] }); // goals

      const res = await request(app).post('/auth/google').send({ email: 'g@g.com', name: 'G', googleId: 'gid1' });
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.deletionCancelled).toBe(false);
    });

    it('logs in existing user via google', async () => {
      pool.query
        // SELECT - found, already linked (has google_id) so no link UPDATE fires
        .mockResolvedValueOnce({ rows: [{ id: 2, email: 'g@g.com', name: 'G', google_id: 'gid1', profile: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null, scheduled_deletion_at: null }] })
        .mockResolvedValueOnce({ rows: [{ points: 5, streak: 1, last_login_at: null }] }) // updateStreak SELECT
        .mockResolvedValueOnce({}) // updateStreak UPDATE
        .mockResolvedValueOnce({ rows: [] }) // conditions
        .mockResolvedValueOnce({ rows: [] }); // goals

      const res = await request(app).post('/auth/google').send({ email: 'g@g.com', name: 'G', googleId: 'gid1' });
      expect(res.status).toBe(200);
      expect(res.body.deletionCancelled).toBe(false);
    });

    it('links google to an existing email/password account', async () => {
      pool.query
        // SELECT - found, no google_id yet, so the link UPDATE fires
        .mockResolvedValueOnce({ rows: [{ id: 2, email: 'g@g.com', name: 'G', google_id: null, profile: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null, scheduled_deletion_at: null }] })
        .mockResolvedValueOnce({}) // UPDATE users SET google_id
        .mockResolvedValueOnce({ rows: [{ points: 5, streak: 1, last_login_at: null }] }) // updateStreak SELECT
        .mockResolvedValueOnce({}) // updateStreak UPDATE
        .mockResolvedValueOnce({ rows: [] }) // conditions
        .mockResolvedValueOnce({ rows: [] }); // goals

      const res = await request(app).post('/auth/google').send({ email: 'g@g.com', name: 'G', googleId: 'gid1' });
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });

    it('cancels scheduled deletion on google login', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 2, email: 'g@g.com', name: 'G', google_id: 'gid1', profile: null, is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null, scheduled_deletion_at: '2026-07-01' }] })
        .mockResolvedValueOnce({}) // cancel deletion UPDATE
        .mockResolvedValueOnce({ rows: [{ points: 5, streak: 1, last_login_at: null }] })
        .mockResolvedValueOnce({}) // updateStreak UPDATE
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/auth/google').send({ email: 'g@g.com', name: 'G', googleId: 'gid1' });
      expect(res.status).toBe(200);
      expect(res.body.deletionCancelled).toBe(true);
    });

    it('returns 500 on db error', async () => {
      pool.query.mockRejectedValue(new Error('db'));
      const res = await request(app).post('/auth/google').send({ email: 'g@g.com', name: 'G', googleId: 'gid1' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /auth/me - edge cases', () => {
    it('returns 401 without cookie', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/auth/me').set('Cookie', 'token=valid');
      expect(res.status).toBe(404);
    });

    it('includes scheduledDeletionAt when set', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.c', name: 'A', points: 5, streak: 1, profile: null, scheduled_deletion_at: '2026-07-01T00:00:00Z', is_premium: false, subscription_expires_at: null, image_scans_used: 0, subscription_plan: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/auth/me').set('Cookie', 'token=valid');
      expect(res.status).toBe(200);
      expect(res.body.user.scheduledDeletionAt).toBe('2026-07-01T00:00:00Z');
    });

    it('returns 500 on db error', async () => {
      pool.query.mockRejectedValue(new Error('db'));
      const res = await request(app).get('/auth/me').set('Cookie', 'token=valid');
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /auth/profile', () => {
    it('updates profile successfully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ profile: { age: 25 } }] }) // SELECT current
        .mockResolvedValueOnce({}) // UPDATE profile
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.c', name: 'A', points: 5, streak: 1, profile: { age: 25, weight: 70 } }] }) // SELECT updated
        .mockResolvedValueOnce({ rows: [] }) // conditions
        .mockResolvedValueOnce({ rows: [] }); // goals

      const res = await request(app).put('/auth/profile').set('Cookie', 'token=valid').send({ profile: { weight: 70 } });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('syncs conditions and goals when provided', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ profile: {} }] }) // SELECT current
        .mockResolvedValueOnce({}) // UPDATE profile
        .mockResolvedValueOnce({}) // DELETE conditions
        .mockResolvedValueOnce({}) // INSERT condition
        .mockResolvedValueOnce({}) // DELETE goals
        .mockResolvedValueOnce({}) // INSERT goal
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.c', name: 'A', points: 5, streak: 1, profile: {} }] })
        .mockResolvedValueOnce({ rows: [{ name: 'Diabetes', severity: 'High' }] })
        .mockResolvedValueOnce({ rows: [{ goal_name: 'Lose weight' }] });

      const res = await request(app).put('/auth/profile').set('Cookie', 'token=valid')
        .send({ profile: { conditions: [{ name: 'Diabetes', severity: 'High' }], goals: ['Lose weight'] } });
      expect(res.status).toBe(200);
    });

    it('returns 404 when user not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).put('/auth/profile').set('Cookie', 'token=valid').send({ profile: {} });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      pool.query.mockRejectedValue(new Error('db'));
      const res = await request(app).put('/auth/profile').set('Cookie', 'token=valid').send({ profile: {} });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /auth/streak', () => {
    it('returns streak and points', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ points: 10, streak: 2, last_login_at: null }] })
        .mockResolvedValueOnce({}); // UPDATE

      const res = await request(app).get('/auth/streak').set('Cookie', 'token=valid');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('points');
      expect(res.body).toHaveProperty('streak');
    });

    it('returns 500 on db error', async () => {
      pool.query.mockRejectedValue(new Error('db'));
      const res = await request(app).get('/auth/streak').set('Cookie', 'token=valid');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /auth/leaderboard', () => {
    it('returns leaderboard data', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ name: 'A', points: 50, streak: 5 }, { name: 'B', points: 30, streak: 3 }] });
      const res = await request(app).get('/auth/leaderboard').set('Cookie', 'token=valid');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('A');
    });

    it('returns 500 on db error', async () => {
      pool.query.mockRejectedValue(new Error('db'));
      const res = await request(app).get('/auth/leaderboard').set('Cookie', 'token=valid');
      expect(res.status).toBe(500);
    });
  });
});
