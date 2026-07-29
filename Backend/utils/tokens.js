const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const JWT_ISSUER = process.env.JWT_ISSUER || 'fitscore-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'fitscore-clients';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') return 'test-only-jwt-secret-at-least-32-characters';
    throw new Error('JWT_SECRET is required');
  }
  if (process.env.NODE_ENV === 'production' && Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes in production');
  }
  return secret;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const metadataHash = (value) => value ? hashToken(String(value)).slice(0, 32) : null;

const signAccessToken = ({ userId, tokenVersion = 0 }) => jwt.sign(
  { userId, tokenVersion, type: 'access' },
  getJwtSecret(),
  {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: String(userId),
    jwtid: crypto.randomUUID(),
  },
);

const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret(), {
  algorithms: ['HS256'],
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
});

const createRefreshToken = () => crypto.randomBytes(64).toString('base64url');

const insertRefreshToken = async (pool, { rawToken, userId, familyId, expiresAt, req }) => {
  await pool.query(
    `INSERT INTO refresh_tokens
      (token_hash, user_id, family_id, expires_at, ip_hash, user_agent_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      hashToken(rawToken),
      userId,
      familyId,
      expiresAt,
      metadataHash(req?.ip),
      metadataHash(req?.headers?.['user-agent']),
    ],
  );
};

const issueSession = async (pool, user, req) => {
  const refreshToken = createRefreshToken();
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400000);
  await insertRefreshToken(pool, {
    rawToken: refreshToken,
    userId: user.id,
    familyId,
    expiresAt,
    req,
  });
  return {
    accessToken: signAccessToken({ userId: user.id, tokenVersion: user.token_version || 0 }),
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
};

const rotateRefreshToken = async (pool, rawToken, req) => {
  const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
  const ownsClient = client !== pool;
  const tokenHash = hashToken(rawToken);

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT rt.*, u.token_version
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
       FOR UPDATE`,
      [tokenHash],
    );
    const stored = result.rows[0];
    if (!stored) {
      await client.query('ROLLBACK');
      const error = new Error('Invalid refresh token');
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    if (stored.revoked_at || stored.rotated_at) {
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = $1',
        [stored.family_id],
      );
      await client.query('COMMIT');
      const error = new Error('Refresh token reuse detected');
      error.code = 'REFRESH_TOKEN_REUSE';
      throw error;
    }

    if (new Date(stored.expires_at).getTime() <= Date.now()) {
      await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
      await client.query('COMMIT');
      const error = new Error('Refresh token expired');
      error.code = 'REFRESH_TOKEN_EXPIRED';
      throw error;
    }

    const nextRefreshToken = createRefreshToken();
    const nextHash = hashToken(nextRefreshToken);
    const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400000);
    await client.query(
      `UPDATE refresh_tokens
       SET rotated_at = NOW(), replaced_by_hash = $1
       WHERE token_hash = $2`,
      [nextHash, tokenHash],
    );
    await insertRefreshToken(client, {
      rawToken: nextRefreshToken,
      userId: stored.user_id,
      familyId: stored.family_id,
      expiresAt: nextExpiresAt,
      req,
    });
    await client.query('COMMIT');

    return {
      userId: stored.user_id,
      accessToken: signAccessToken({ userId: stored.user_id, tokenVersion: stored.token_version || 0 }),
      refreshToken: nextRefreshToken,
      refreshExpiresAt: nextExpiresAt,
    };
  } catch (error) {
    if (!['REFRESH_TOKEN_REUSE', 'REFRESH_TOKEN_EXPIRED'].includes(error.code)) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (ownsClient) client.release();
  }
};

const revokeRefreshToken = async (pool, rawToken) => {
  if (!rawToken) return;
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = $1',
    [hashToken(rawToken)],
  );
};

const revokeUserSessions = (pool, userId) => pool.query(
  'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1',
  [userId],
);

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  getJwtSecret,
  hashToken,
  issueSession,
  revokeRefreshToken,
  revokeUserSessions,
  rotateRefreshToken,
  signAccessToken,
  verifyAccessToken,
};
