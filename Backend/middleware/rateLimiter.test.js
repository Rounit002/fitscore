const { authLimiter, analyzeLimiter } = require('./rateLimiter');

describe('rateLimiter middleware', () => {
  it('authLimiter passes through', () => {
    const next = jest.fn();
    authLimiter({}, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('analyzeLimiter passes through', () => {
    const next = jest.fn();
    analyzeLimiter({}, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
