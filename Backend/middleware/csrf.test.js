const { csrfProtection, issueCsrfToken } = require('./csrf');

const createResponse = () => ({
  cookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('CSRF protection', () => {
  it('issues a high-entropy token in the response cookie', () => {
    const req = { cookies: {} };
    const res = createResponse();
    const token = issueCsrfToken(req, res);
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,100}$/);
    expect(res.cookie).toHaveBeenCalledWith('fitscore_csrf', token, expect.objectContaining({ httpOnly: false }));
  });

  it('rejects an unsafe cookie-authenticated request without a matching header', () => {
    const req = { method: 'POST', originalUrl: '/auth/profile', cookies: { fitscore_csrf: 'a'.repeat(43) }, headers: {} };
    const res = createResponse();
    const next = jest.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a matching double-submit token', () => {
    const token = 'a'.repeat(43);
    const req = { method: 'PUT', originalUrl: '/auth/profile', cookies: { fitscore_csrf: token }, headers: { 'x-csrf-token': token } };
    const next = jest.fn();
    csrfProtection(req, createResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('does not require CSRF for bearer-authenticated mobile writes', () => {
    const req = { method: 'POST', originalUrl: '/scans', cookies: {}, headers: { authorization: 'Bearer token' } };
    const next = jest.fn();
    csrfProtection(req, createResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('allows a pre-auth native sign-in that has no cookies to double-submit', () => {
    const req = { method: 'POST', originalUrl: '/auth/register', cookies: {}, headers: { 'x-client': 'mobile' } };
    const next = jest.fn();
    csrfProtection(req, createResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('still enforces CSRF when a session cookie rides along with X-Client', () => {
    const req = {
      method: 'POST',
      originalUrl: '/auth/profile',
      cookies: { token: 'victim-session' },
      headers: { 'x-client': 'mobile' },
    };
    const res = createResponse();
    const next = jest.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a cookie-less browser write that omits the client hint', () => {
    const req = { method: 'POST', originalUrl: '/auth/register', cookies: {}, headers: {} };
    const res = createResponse();
    const next = jest.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
