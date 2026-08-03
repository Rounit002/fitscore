const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const mockGoogleRequest = jest.fn();
const mockGetClient = jest.fn(async () => ({ request: mockGoogleRequest }));

jest.mock('jsonwebtoken');
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({ getClient: mockGetClient })),
    },
  },
}));

const playIntegrityRouter = require('./playIntegrity');
const {
  buildRequestHash,
  evaluateTokenPayload,
  requirePlayIntegrity,
  stableStringify,
} = playIntegrityRouter;

const originalEnv = process.env;
const validToken = 'integrity-token-'.padEnd(100, 'x');

function validPayload(requestHash, overrides = {}) {
  return {
    requestDetails: {
      requestPackageName: 'com.bitezsnap.app',
      requestHash,
      timestampMillis: String(Date.now()),
      ...overrides.requestDetails,
    },
    appIntegrity: {
      appRecognitionVerdict: 'PLAY_RECOGNIZED',
      packageName: 'com.bitezsnap.app',
      certificateSha256Digest: ['release-cert'],
      ...overrides.appIntegrity,
    },
    deviceIntegrity: {
      deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'],
      ...overrides.deviceIntegrity,
    },
    accountDetails: {
      appLicensingVerdict: 'LICENSED',
      ...overrides.accountDetails,
    },
  };
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    next();
  });
  app.use('/integrity', playIntegrityRouter);
  app.post('/protected', requirePlayIntegrity('razorpay_verify'), (req, res) => {
    res.json({ body: req.body, integrity: req.playIntegrity });
  });
  return app;
}

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-that-is-long-enough-for-tests',
    GOOGLE_PACKAGE_NAME: 'com.bitezsnap.app',
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'integrity@test.invalid' }),
    PLAY_INTEGRITY_ALLOWED_CERT_DIGESTS: 'release-cert',
  };
  jwt.verify.mockReset();
  jwt.verify.mockReturnValue({ userId: 7 });
  mockGoogleRequest.mockReset();
  mockGetClient.mockClear();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Play Integrity request binding', () => {
  it('canonicalizes equivalent objects to the same request hash', () => {
    expect(stableStringify({ b: 2, a: { z: true, y: 1 } }))
      .toBe(stableStringify({ a: { y: 1, z: true }, b: 2 }));
    expect(buildRequestHash('razorpay_verify', { b: 2, a: 1 }))
      .toBe(buildRequestHash('razorpay_verify', { a: 1, b: 2 }));
    expect(buildRequestHash('razorpay_verify', { a: 1 }))
      .not.toBe(buildRequestHash('revenuecat_sync', { a: 1 }));
  });

  it('rejects a stale, mismatched, unrecognized verdict', () => {
    const result = evaluateTokenPayload(
      validPayload('wrong-hash', {
        requestDetails: {
          requestPackageName: 'com.attacker.app',
          timestampMillis: String(Date.now() - 600_000),
        },
        appIntegrity: {
          appRecognitionVerdict: 'UNRECOGNIZED_VERSION',
          packageName: 'com.attacker.app',
          certificateSha256Digest: ['attacker-cert'],
        },
        deviceIntegrity: { deviceRecognitionVerdict: [] },
        accountDetails: { appLicensingVerdict: 'UNLICENSED' },
      }),
      'expected-hash',
    );

    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'request_hash_mismatch',
      'request_timestamp_stale',
      'request_package_mismatch',
      'app_not_play_recognized',
      'app_package_mismatch',
      'device_integrity_failed',
      'app_not_licensed',
      'certificate_mismatch',
    ]));
  });
});

describe('POST /integrity/verify', () => {
  it('requires authentication before calling Google', async () => {
    const res = await request(createApp())
      .post('/integrity/verify')
      .send({ integrityToken: validToken, action: 'revenuecat_sync', requestData: {} });

    expect(res.status).toBe(401);
    expect(mockGoogleRequest).not.toHaveBeenCalled();
  });

  it('decodes with Google and returns a passing verdict', async () => {
    const requestData = { appUserId: 'nutriscan_7' };
    const expectedHash = buildRequestHash('revenuecat_sync', requestData);
    mockGoogleRequest.mockResolvedValue({
      data: { tokenPayloadExternal: validPayload(expectedHash) },
    });

    const res = await request(createApp())
      .post('/integrity/verify')
      .set('Cookie', 'token=valid')
      .send({ integrityToken: validToken, action: 'revenuecat_sync', requestData });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ passed: true, verdict: 'PASS' });
    expect(mockGoogleRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://playintegrity.googleapis.com/v1/com.bitezsnap.app:decodeIntegrityToken',
      method: 'POST',
      data: { integrity_token: validToken },
    }));
  });

  it('returns fail when the token is bound to different request data', async () => {
    mockGoogleRequest.mockResolvedValue({
      data: { tokenPayloadExternal: validPayload('different-hash') },
    });

    const res = await request(createApp())
      .post('/integrity/verify')
      .set('Cookie', 'token=valid')
      .send({
        integrityToken: validToken,
        action: 'razorpay_verify',
        requestData: { razorpay_order_id: 'order_1' },
      });

    expect(res.status).toBe(403);
    expect(res.body.reasons).toContain('request_hash_mismatch');
  });

  it('does not expose Google errors or token material', async () => {
    mockGoogleRequest.mockRejectedValue(new Error(`decode failed for ${validToken}`));

    const res = await request(createApp())
      .post('/integrity/verify')
      .set('Cookie', 'token=valid')
      .send({ integrityToken: validToken, action: 'revenuecat_sync', requestData: {} });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      passed: false,
      verdict: 'ERROR',
      reasons: ['verification_unavailable'],
    });
    expect(JSON.stringify(res.body)).not.toContain(validToken);
  });
});

describe('production enforcement middleware', () => {
  it('does not block test/development flows and strips the token field', async () => {
    process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED = 'true';
    const res = await request(createApp())
      .post('/protected')
      .send({ value: 1, integrityToken: validToken });

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ value: 1 });
    expect(res.body.integrity).toMatchObject({ enforced: false, passed: true });
    expect(mockGoogleRequest).not.toHaveBeenCalled();
  });

  it('fails closed in production when the token is absent', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED = 'true';

    const res = await request(createApp()).post('/protected').send({ value: 1 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAY_INTEGRITY_REQUIRED');
  });

  it('allows a request-bound passing token in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED = 'true';
    const requestData = { value: 1 };
    mockGoogleRequest.mockResolvedValue({
      data: {
        tokenPayloadExternal: validPayload(buildRequestHash('razorpay_verify', requestData)),
      },
    });

    const res = await request(createApp())
      .post('/protected')
      .send({ ...requestData, integrityToken: validToken });

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual(requestData);
    expect(res.body.integrity).toMatchObject({ enforced: true, passed: true });
  });
});
