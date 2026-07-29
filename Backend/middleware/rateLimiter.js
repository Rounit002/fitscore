const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { slowDown } = require('express-slow-down');
const { securityLog } = require('../utils/securityLogger');

const disabled = () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_ENABLED !== 'true';

const limitHandler = (name) => (req, res, _next, options) => {
  securityLog('rate_limit_exceeded', req, { limiter: name });
  res.status(options.statusCode).json({
    error: 'Too many requests. Please try again later.',
    retryAfter: Math.max(1, Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000)) || undefined,
  });
};

const createLimiter = (name, options) => {
  if (process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_ENABLED !== 'true') {
    return (_req, _res, next) => next();
  }
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: limitHandler(name),
    ...options,
  });
};

const globalLimiter = createLimiter('global', {
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.GLOBAL_RATE_LIMIT || 300),
});

const loginLimiter = createLimiter('login', {
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  skipSuccessfulRequests: true,
});

const signupLimiter = createLimiter('signup', {
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.SIGNUP_RATE_LIMIT || 5),
});

const passwordResetLimiter = createLimiter('password_reset', {
  windowMs: 30 * 60 * 1000,
  limit: Number(process.env.PASSWORD_RESET_RATE_LIMIT || 5),
});

const analyzeIpLimiter = createLimiter('analyze_ip', {
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.ANALYZE_IP_RATE_LIMIT || 20),
});

const analyzeUserLimiter = createLimiter('analyze_user', {
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.ANALYZE_USER_RATE_LIMIT || 12),
  keyGenerator: (req) => req.userId ? `user:${req.userId}` : `ip:${ipKeyGenerator(req.ip)}`,
});

const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (used) => Math.min((used - 3) * 500, 5000),
  maxDelayMs: 5000,
  skip: disabled,
  validate: { delayMs: false },
});

const apiSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: (used) => Math.min((used - 100) * 100, 2000),
  maxDelayMs: 2000,
  skip: disabled,
  validate: { delayMs: false },
});

module.exports = {
  analyzeIpLimiter,
  analyzeLimiter: analyzeIpLimiter,
  analyzeUserLimiter,
  apiSlowDown,
  authLimiter: loginLimiter,
  authSlowDown,
  globalLimiter,
  loginLimiter,
  passwordResetLimiter,
  signupLimiter,
};
