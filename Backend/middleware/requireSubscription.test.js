const requireSubscription = require('./requireSubscription');

describe('requireSubscription middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('returns 401 when no req.user', () => {
    requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when no profile', () => {
    req.user = {};
    requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when status is not active', () => {
    req.user = { profile: { subscription_status: 'canceled' } };
    requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when subscription expired', () => {
    req.user = { profile: { subscription_status: 'active', subscription_expiry: Date.now() - 1000 } };
    requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when subscription is valid', () => {
    req.user = { profile: { subscription_status: 'active', subscription_expiry: Date.now() + 100000 } };
    requireSubscription(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
