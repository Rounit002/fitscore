const isProduction = (nodeEnv = process.env.NODE_ENV) => nodeEnv === 'production';

const baseOptions = (nodeEnv = process.env.NODE_ENV) => ({
  httpOnly: true,
  secure: isProduction(nodeEnv),
  // The Render frontend and API use separate onrender.com sites.
  sameSite: isProduction(nodeEnv) ? 'none' : 'lax',
});

const createAuthCookieOptions = (nodeEnv = process.env.NODE_ENV) => ({
  ...baseOptions(nodeEnv),
  path: '/',
  maxAge: 15 * 60 * 1000,
});

const createRefreshCookieOptions = (nodeEnv = process.env.NODE_ENV) => ({
  ...baseOptions(nodeEnv),
  path: '/auth',
  maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
});

const createClearAuthCookieOptions = (nodeEnv = process.env.NODE_ENV) => {
  const { maxAge: _maxAge, ...clearOptions } = createAuthCookieOptions(nodeEnv);
  return clearOptions;
};

const createClearRefreshCookieOptions = (nodeEnv = process.env.NODE_ENV) => {
  const { maxAge: _maxAge, ...clearOptions } = createRefreshCookieOptions(nodeEnv);
  return clearOptions;
};

module.exports = {
  createAuthCookieOptions,
  createClearAuthCookieOptions,
  createRefreshCookieOptions,
  createClearRefreshCookieOptions,
};
