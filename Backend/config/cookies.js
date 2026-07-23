const isProduction = (nodeEnv = process.env.NODE_ENV) => nodeEnv === 'production';

const createAuthCookieOptions = (nodeEnv = process.env.NODE_ENV) => ({
  httpOnly: true,
  secure: isProduction(nodeEnv),
  // The Render frontend and API use separate onrender.com sites.
  sameSite: isProduction(nodeEnv) ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

const createClearAuthCookieOptions = (nodeEnv = process.env.NODE_ENV) => {
  const { maxAge: _maxAge, ...clearOptions } = createAuthCookieOptions(nodeEnv);
  return clearOptions;
};

module.exports = {
  createAuthCookieOptions,
  createClearAuthCookieOptions,
};
