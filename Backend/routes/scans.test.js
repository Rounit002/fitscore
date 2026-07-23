const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

jest.mock('jsonwebtoken');
jest.mock('../config/cloudinary', () => ({ uploadImage: jest.fn() }));

const scansRouter = require('./scans');
const { uploadImage } = require('../config/cloudinary');

let mockPool;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = mockPool; next(); });
  app.use('/api/scans', scansRouter);
  return app;
}

beforeEach(() => {
  mockPool = { query: jest.fn() };
  jwt.verify.mockReturnValue({ userId: 1 });
  uploadImage.mockResolvedValue('https://cloudinary.com/test.jpg');
  global.fetch = jest.fn();
});

afterEach(() => { delete global.fetch; });

describe('Auth', () => {
  it('returns 401 without token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const res = await request(createApp()).get('/api/scans');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/scans', () => {
  it('returns scan history', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, product_name: 'Test' }] });
    const res = await request(createApp()).get('/api/scans').set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 500 on db error', async () => {
    mockPool.query.mockRejectedValue(new Error('db'));
    const res = await request(createApp()).get('/api/scans').set('Cookie', 'token=valid');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/scans/database', () => {
  it('returns products without search', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, product_name: 'Milk', brand: 'Amul' }] });
    const res = await request(createApp()).get('/api/scans/database').set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns merged results with search', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, product_name: 'Oats', brand: 'Quaker' }] });
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: [{ product_name: 'Oats Bar', brands: 'Nature', code: '123', nutriments: {} }] }),
    });
    const res = await request(createApp()).get('/api/scans/database?search=oats').set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 500 on db error', async () => {
    mockPool.query.mockRejectedValue(new Error('db'));
    const res = await request(createApp()).get('/api/scans/database').set('Cookie', 'token=valid');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/scans', () => {
  const scanBody = { productName: 'TestProduct', brand: 'TestBrand', score: 7, ingredients: '[]' };

  it('saves a scan', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, ...scanBody, image_url: null }] }) // INSERT scan
      .mockResolvedValueOnce({ rows: [] }) // SELECT translations
      .mockResolvedValueOnce({}) // UPSERT product_database
      .mockResolvedValueOnce({}); // UPDATE user points
    const res = await request(createApp()).post('/api/scans').set('Cookie', 'token=valid').send(scanBody);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('uploads base64 image to cloudinary', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 2, image_url: 'https://cloudinary.com/test.jpg' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const res = await request(createApp())
      .post('/api/scans')
      .set('Cookie', 'token=valid')
      .send({ ...scanBody, imageUrl: 'data:image/png;base64,abc' });
    expect(res.status).toBe(200);
    expect(uploadImage).toHaveBeenCalledWith('data:image/png;base64,abc');
  });

  it('returns 500 on db error', async () => {
    mockPool.query.mockRejectedValue(new Error('db'));
    const res = await request(createApp()).post('/api/scans').set('Cookie', 'token=valid').send(scanBody);
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/scans/:id/servings', () => {
  it('updates servings', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, servings: 2 }] });
    const res = await request(createApp())
      .patch('/api/scans/1/servings')
      .set('Cookie', 'token=valid')
      .send({ servings: 2 });
    expect(res.status).toBe(200);
    expect(res.body.servings).toBe(2);
  });

  it('returns 400 for invalid servings', async () => {
    const res = await request(createApp())
      .patch('/api/scans/1/servings')
      .set('Cookie', 'token=valid')
      .send({ servings: -1 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when scan not found', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp())
      .patch('/api/scans/999/servings')
      .set('Cookie', 'token=valid')
      .send({ servings: 1 });
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-owner', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ user_id: 99 }] });
    const res = await request(createApp())
      .patch('/api/scans/1/servings')
      .set('Cookie', 'token=valid')
      .send({ servings: 1 });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/scans/:id', () => {
  it('returns scan by id', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, user_id: 1, product_name: 'X' }] });
    const res = await request(createApp()).get('/api/scans/1').set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns 404 when not found', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp()).get('/api/scans/999').set('Cookie', 'token=valid');
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-owner', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, user_id: 99 }] });
    const res = await request(createApp()).get('/api/scans/1').set('Cookie', 'token=valid');
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/scans/:id', () => {
  it('deletes scan', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({});
    const res = await request(createApp()).delete('/api/scans/1').set('Cookie', 'token=valid');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });

  it('returns 404 when not found', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const res = await request(createApp()).delete('/api/scans/999').set('Cookie', 'token=valid');
    expect(res.status).toBe(404);
  });

  it('returns 403 for non-owner', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ user_id: 99 }] });
    const res = await request(createApp()).delete('/api/scans/1').set('Cookie', 'token=valid');
    expect(res.status).toBe(403);
  });
});
