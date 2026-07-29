const jwt = require('jsonwebtoken');
const authenticate = require('./auth');

jest.mock('jsonwebtoken');

describe('authenticate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { cookies: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('returns 401 when no token', () => {
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns 401 when token is invalid', () => {
    req.cookies.token = 'bad';
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('sets req.userId and calls next for valid token', () => {
    req.cookies.token = 'valid';
    jwt.verify.mockReturnValue({ userId: 42 });
    authenticate(req, res, next);
    expect(req.userId).toBe(42);
    expect(next).toHaveBeenCalled();
  });
});
