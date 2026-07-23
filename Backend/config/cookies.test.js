const {
  createAuthCookieOptions,
  createClearAuthCookieOptions,
} = require('./cookies');

describe('authentication cookie configuration', () => {
  it('uses cross-site secure cookies in production', () => {
    expect(createAuthCookieOptions('production')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  });

  it('uses localhost-compatible cookies outside production', () => {
    expect(createAuthCookieOptions('development')).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  });

  it('uses matching attributes when clearing the cookie', () => {
    expect(createClearAuthCookieOptions('production')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  });
});
