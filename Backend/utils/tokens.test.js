const jwt = require('jsonwebtoken');
const { hashToken, issueSession, rotateRefreshToken } = require('./tokens');

describe('session tokens', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret-that-is-longer-than-thirty-two-bytes';
  });

  it('stores only a hash of the refresh token and issues a short-lived access token', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const session = await issueSession(pool, { id: 7, token_version: 2 }, { ip: '127.0.0.1', headers: {} });
    const insertParams = pool.query.mock.calls[0][1];
    expect(insertParams[0]).toBe(hashToken(session.refreshToken));
    expect(insertParams[0]).not.toBe(session.refreshToken);

    const decoded = jwt.verify(session.accessToken, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'fitscore-api',
      audience: 'fitscore-clients',
    });
    expect(decoded).toEqual(expect.objectContaining({ userId: 7, tokenVersion: 2, type: 'access' }));
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(15 * 60);
  });

  it('revokes the whole token family when a rotated refresh token is replayed', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ user_id: 7, family_id: 'family', rotated_at: new Date(), expires_at: new Date(Date.now() + 10000) }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    await expect(rotateRefreshToken(pool, 'replayed-token', { headers: {} }))
      .rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSE' });
    expect(client.query).toHaveBeenCalledWith(
      'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = $1',
      ['family'],
    );
  });
});
