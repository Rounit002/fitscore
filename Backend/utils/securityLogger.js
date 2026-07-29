const crypto = require('crypto');

const REDACTED_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'authorization',
  'cookie',
  'email',
  'name',
  'profile',
  'imageBase64',
  'purchaseToken',
]);

const hashIdentifier = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
};

const sanitizeDetails = (details = {}) => Object.fromEntries(
  Object.entries(details)
    .filter(([key, value]) => value !== undefined && !REDACTED_KEYS.has(key))
    .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 200) : value])
);

const securityLog = (event, req, details = {}, level = 'warn') => {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    type: 'security',
    event,
    requestId: req?.id,
    method: req?.method,
    path: req?.originalUrl,
    ipHash: hashIdentifier(req?.ip),
    userIdHash: hashIdentifier(req?.userId),
    ...sanitizeDetails(details),
  };

  const writer = console[level] || console.warn;
  writer(JSON.stringify(record));
};

module.exports = { hashIdentifier, securityLog };
