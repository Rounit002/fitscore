// Rate limiters disabled for local development and testing
const authLimiter = (req, res, next) => next();
const analyzeLimiter = (req, res, next) => next();

module.exports = {
  authLimiter,
  analyzeLimiter,
};
