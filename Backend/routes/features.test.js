const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

jest.mock('jsonwebtoken');

const featuresRouter = require('./features');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = mockPool; next(); });
  app.use('/api/features', featuresRouter);
  return app;
}

let mockPool;

beforeEach(() => {
  mockPool = { query: jest.fn() };
  jwt.verify.mockReturnValue({ userId: 1 });
});

describe('GET /api/features', () => {
  it('returns features with vote counts', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, title: 'Dark mode', voters: { '1': 'up', '2': 'down' } }] });
    const res = await request(createApp()).get('/api/features');
    expect(res.status).toBe(200);
    expect(res.body[0].upvotes).toBe(1);
    expect(res.body[0].downvotes).toBe(1);
  });

  it('handles null voters', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, voters: null }] });
    const res = await request(createApp()).get('/api/features');
    expect(res.body[0].upvotes).toBe(0);
  });

  it('returns 500 on db error', async () => {
    mockPool.query.mockRejectedValue(new Error('db'));
    const res = await request(createApp()).get('/api/features');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/features', () => {
  it('creates a feature request', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, title: 'New Feature' }] });
    const res = await request(createApp())
      .post('/api/features')
      .set('Cookie', 'token=valid')
      .send({ title: 'New Feature', description: 'Please add this' });
    expect(res.status).toBe(201);
  });

  it('returns 400 without title', async () => {
    const res = await request(createApp())
      .post('/api/features')
      .set('Cookie', 'token=valid')
      .send({ description: 'no title' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const res = await request(createApp())
      .post('/api/features')
      .send({ title: 'X', description: 'Y' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/features/:id/vote', () => {
  it('registers an upvote', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ voters: {} }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, voters: { '1': 'up' } }] });
    const res = await request(createApp())
      .post('/api/features/1/vote')
      .set('Cookie', 'token=valid')
      .send({ vote: 'up' });
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid vote type', async () => {
    const res = await request(createApp())
      .post('/api/features/1/vote')
      .set('Cookie', 'token=valid')
      .send({ vote: 'sideways' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for missing feature', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .post('/api/features/999/vote')
      .set('Cookie', 'token=valid')
      .send({ vote: 'up' });
    expect(res.status).toBe(404);
  });

  it('removes vote with none', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ voters: { '1': 'up' } }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, voters: {} }] });
    const res = await request(createApp())
      .post('/api/features/1/vote')
      .set('Cookie', 'token=valid')
      .send({ vote: 'none' });
    expect(res.status).toBe(200);
  });
});
