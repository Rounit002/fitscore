const {
  createCorsOptions,
  getAllowedOrigins,
  normalizeOrigin,
} = require('./cors');
const express = require('express');
const cors = require('cors');
const request = require('supertest');

describe('CORS configuration', () => {
  it('normalizes origins and removes trailing paths', () => {
    expect(normalizeOrigin(' https://example.com/path/ ')).toBe('https://example.com');
  });

  it('allows local, deployed, and configured frontend origins', () => {
    const origins = getAllowedOrigins({
      FRONTEND_URL: 'https://primary.example.com/',
      FRONTEND_URLS: 'https://preview-one.example.com, https://preview-two.example.com/',
    });

    expect(origins).toEqual(new Set([
      'http://localhost:5173',
      'https://localhost',
      'https://fitscore-6hqp.onrender.com',
      'https://primary.example.com',
      'https://preview-one.example.com',
      'https://preview-two.example.com',
    ]));
  });

  it.each([
    undefined,
    'http://localhost:5173',
    'https://localhost',
    'https://fitscore-6hqp.onrender.com',
    'https://configured.example.com',
  ])('accepts an approved origin: %s', (origin) => {
    const options = createCorsOptions({ FRONTEND_URL: 'https://configured.example.com' });
    const callback = jest.fn();

    options.origin(origin, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects an unapproved origin', () => {
    const options = createCorsOptions({});
    const callback = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    options.origin('https://untrusted.example.com', callback);

    expect(callback).toHaveBeenCalledWith(null, false);
    warnSpy.mockRestore();
  });

  it('enables credentials and caches successful preflights', () => {
    const options = createCorsOptions({});

    expect(options.credentials).toBe(true);
    expect(options.optionsSuccessStatus).toBe(204);
    expect(options.maxAge).toBe(86400);
  });

  it('returns credentialed CORS headers for the deployed frontend preflight', async () => {
    const app = express();
    app.use(cors(createCorsOptions({})));
    app.post('/auth/register', (_req, res) => res.sendStatus(200));

    const response = await request(app)
      .options('/auth/register')
      .set('Origin', 'https://fitscore-6hqp.onrender.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin'])
      .toBe('https://fitscore-6hqp.onrender.com');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
