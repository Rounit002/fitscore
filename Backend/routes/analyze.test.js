const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

jest.mock('jsonwebtoken');
jest.mock('../config/queue');
jest.mock('../middleware/requirePlan', () => jest.fn(() => (req, res, next) => next()));

const { addAnalysisJob, getJobStatus, addPreCompletedJob } = require('../config/queue');
const { router: analyzeRouter } = require('./analyze');

let mockPool;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, res, next) => { req.pool = mockPool; next(); });
  app.use('/api/analyze', analyzeRouter);
  return app;
}

beforeEach(() => {
  mockPool = { query: jest.fn() };
  jwt.verify.mockReturnValue({ userId: 1 });
  jest.clearAllMocks();
});

describe('POST /api/analyze/image', () => {
  const validBody = { imageBase64: 'data:image/png;base64,abc123' };

  it('returns 401 without token', async () => {
    const res = await request(createApp()).post('/api/analyze/image').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 when imageBase64 is missing', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ plan: 'pro', scans_used: 0, scan_limit: 100 }] });
    const res = await request(createApp())
      .post('/api/analyze/image')
      .set('Cookie', 'token=valid')
      .send({});
    expect(res.status).toBe(400);
  });

  it('queues job on success', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ plan: 'pro', plan_expires_at: null, scans_used: 0, scan_limit: 100 }] });
    addAnalysisJob.mockResolvedValue({ id: 'job_123', status: 'queued' });
    const res = await request(createApp())
      .post('/api/analyze/image')
      .set('Cookie', 'token=valid')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(addAnalysisJob).toHaveBeenCalled();
  });

  it('returns 403 when quota exceeded', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ plan: 'pro', plan_expires_at: null, scans_used: 100, scan_limit: 100 }] });
    const res = await request(createApp())
      .post('/api/analyze/image')
      .set('Cookie', 'token=valid')
      .send(validBody);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/analyze/text', () => {
  const validBody = { productData: { product_name: 'TestProduct', brands: 'TestBrand', ingredients_text: 'sugar, flour' }, lang: 'en' };

  it('returns 401 without token', async () => {
    const res = await request(createApp()).post('/api/analyze/text').send(validBody);
    expect(res.status).toBe(401);
  });

  it('queues job on success', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ plan: 'pro', plan_expires_at: null, scans_used: 0, scan_limit: 100 }] })
      .mockResolvedValueOnce({ rows: [] });
    addAnalysisJob.mockResolvedValue({ id: 'job_123', status: 'queued' });
    const res = await request(createApp())
      .post('/api/analyze/text')
      .set('Cookie', 'token=valid')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(addAnalysisJob).toHaveBeenCalled();
  });

  it('returns pre-completed job on cache hit', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ plan: 'pro', plan_expires_at: null, scans_used: 0, scan_limit: 100 }] })
      .mockResolvedValueOnce({ rows: [{ translations: { en: { result: 'cached' } } }] });
    addPreCompletedJob.mockReturnValue({ id: 'cache_123', status: 'completed' });
    const res = await request(createApp())
      .post('/api/analyze/text')
      .set('Cookie', 'token=valid')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(addPreCompletedJob).toHaveBeenCalled();
  });

  it('returns 403 when quota exceeded', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ plan: 'pro', plan_expires_at: null, scans_used: 100, scan_limit: 100 }] });
    const res = await request(createApp())
      .post('/api/analyze/text')
      .set('Cookie', 'token=valid')
      .send(validBody);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/analyze/status/:jobId', () => {
  it('returns job status', async () => {
    getJobStatus.mockResolvedValue({ id: 'job_123', status: 'completed', result: { score: 80 } });
    const res = await request(createApp()).get('/api/analyze/status/job_123');
    expect(res.status).toBe(200);
    expect(res.body.status || res.body.job?.status).toBeDefined();
  });

  it('returns 404 for unknown job', async () => {
    getJobStatus.mockResolvedValue(null);
    const res = await request(createApp()).get('/api/analyze/status/unknown_job');
    expect(res.status).toBe(404);
  });
});
