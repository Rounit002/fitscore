const requirePlan = require('./requirePlan');

describe('requirePlan middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { userId: 1, pool: { query: jest.fn() } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('returns 404 when user not found', async () => {
    req.pool.query.mockResolvedValue({ rows: [] });
    await requirePlan(['premium'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('auto-downgrades expired plan', async () => {
    const expired = new Date(Date.now() - 100000).toISOString();
    req.pool.query
      .mockResolvedValueOnce({ rows: [{ plan: 'premium', plan_expires_at: expired }] })
      .mockResolvedValueOnce({}) // UPDATE
      .mockResolvedValueOnce({ rows: [{ plan: 'free', plan_expires_at: null }] });
    await requirePlan(['premium'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when plan not in allowed list', async () => {
    req.pool.query.mockResolvedValue({ rows: [{ plan: 'free', plan_expires_at: null }] });
    await requirePlan(['premium'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when plan is allowed', async () => {
    req.pool.query.mockResolvedValue({ rows: [{ plan: 'premium', plan_expires_at: null }] });
    await requirePlan(['premium', 'free'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 500 on db error', async () => {
    req.pool.query.mockRejectedValue(new Error('db'));
    await requirePlan(['premium'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
