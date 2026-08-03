const crypto = require('crypto');
const express = require('express');
const { google } = require('googleapis');
const { z } = require('zod');
const authenticate = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

const PROTECTED_ACTIONS = ['razorpay_verify', 'revenuecat_sync'];
const TOKEN_MAX_LENGTH = 16_000;
const DEFAULT_MAX_TOKEN_AGE_MS = 2 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 30 * 1000;

const requestDataSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= 64_000,
  'requestData is too large',
);

const verifySchema = z.object({
  integrityToken: z.string().min(20).max(TOKEN_MAX_LENGTH),
  action: z.enum(PROTECTED_ACTIONS),
  requestData: requestDataSchema.default({}),
}).strict();

function stableStringify(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';

  if (Array.isArray(value)) {
    return `[${value.map((entry) => (
      entry === undefined || typeof entry === 'function' || typeof entry === 'symbol'
        ? 'null'
        : stableStringify(entry)
    )).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .filter((key) => {
        const entry = value[key];
        return entry !== undefined && typeof entry !== 'function' && typeof entry !== 'symbol';
      })
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return 'null';
}

function buildRequestHash(action, requestData) {
  return crypto
    .createHash('sha256')
    .update(`${action}\n${stableStringify(requestData ?? {})}`, 'utf8')
    .digest('base64url');
}

function isEnforcementEnabled(env = process.env) {
  return env.NODE_ENV === 'production'
    && /^(1|true|yes|on)$/i.test(env.PLAY_INTEGRITY_ENFORCEMENT_ENABLED || '');
}

function getMaxTokenAgeMs(env = process.env) {
  const configured = Number(env.PLAY_INTEGRITY_MAX_TOKEN_AGE_MS);
  if (!Number.isFinite(configured) || configured < 30_000 || configured > 10 * 60 * 1000) {
    return DEFAULT_MAX_TOKEN_AGE_MS;
  }
  return configured;
}

function getAllowedCertificateDigests(env = process.env) {
  return new Set(
    (env.PLAY_INTEGRITY_ALLOWED_CERT_DIGESTS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function evaluateTokenPayload(payload, expectedRequestHash, options = {}) {
  const env = options.env || process.env;
  const now = options.now ?? Date.now();
  const expectedPackageName = env.GOOGLE_PACKAGE_NAME || '';
  const reasons = [];

  const requestDetails = payload?.requestDetails || {};
  const appIntegrity = payload?.appIntegrity || {};
  const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict || [];
  const licensingVerdict = payload?.accountDetails?.appLicensingVerdict;
  const timestamp = Number(requestDetails.timestampMillis);

  if (!expectedPackageName) reasons.push('package_not_configured');
  if (requestDetails.requestPackageName !== expectedPackageName) reasons.push('request_package_mismatch');
  if (requestDetails.requestHash !== expectedRequestHash) reasons.push('request_hash_mismatch');
  if (!Number.isFinite(timestamp)) {
    reasons.push('request_timestamp_invalid');
  } else if (timestamp > now + MAX_CLOCK_SKEW_MS || now - timestamp > getMaxTokenAgeMs(env)) {
    reasons.push('request_timestamp_stale');
  }
  if (appIntegrity.appRecognitionVerdict !== 'PLAY_RECOGNIZED') reasons.push('app_not_play_recognized');
  if (appIntegrity.packageName !== expectedPackageName) reasons.push('app_package_mismatch');
  if (!Array.isArray(deviceVerdicts) || !deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY')) {
    reasons.push('device_integrity_failed');
  }
  if (licensingVerdict !== 'LICENSED') reasons.push('app_not_licensed');

  const allowedDigests = getAllowedCertificateDigests(env);
  const tokenDigests = Array.isArray(appIntegrity.certificateSha256Digest)
    ? appIntegrity.certificateSha256Digest
    : [];
  if (allowedDigests.size > 0 && !tokenDigests.some((digest) => allowedDigests.has(digest))) {
    reasons.push('certificate_mismatch');
  }

  return {
    passed: reasons.length === 0,
    verdict: reasons.length === 0 ? 'PASS' : 'FAIL',
    reasons,
    signals: {
      appRecognitionVerdict: appIntegrity.appRecognitionVerdict || 'UNEVALUATED',
      appLicensingVerdict: licensingVerdict || 'UNEVALUATED',
      meetsDeviceIntegrity: Array.isArray(deviceVerdicts)
        && deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY'),
    },
  };
}

function loadServiceAccountCredentials(env = process.env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  }
  try {
    return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (_error) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is invalid');
  }
}

async function decodeIntegrityToken(integrityToken, env = process.env) {
  const packageName = env.GOOGLE_PACKAGE_NAME;
  if (!packageName) throw new Error('GOOGLE_PACKAGE_NAME is not configured');

  const auth = new google.auth.GoogleAuth({
    credentials: loadServiceAccountCredentials(env),
    scopes: ['https://www.googleapis.com/auth/playintegrity'],
  });
  const authClient = await auth.getClient();
  const response = await authClient.request({
    url: `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`,
    method: 'POST',
    data: { integrity_token: integrityToken },
  });

  const payload = response?.data?.tokenPayloadExternal;
  if (!payload) throw new Error('Google Play Integrity returned no token payload');
  return payload;
}

async function verifyIntegrityToken(integrityToken, expectedRequestHash, options = {}) {
  const env = options.env || process.env;
  const payload = await decodeIntegrityToken(integrityToken, env);
  return evaluateTokenPayload(payload, expectedRequestHash, { env, now: options.now });
}

function extractIntegrityToken(req) {
  const headerToken = req.get('x-play-integrity-token');
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};
  const bodyToken = body.integrityToken;

  if (Object.prototype.hasOwnProperty.call(body, 'integrityToken')) {
    const { integrityToken: _removed, ...requestData } = body;
    req.body = requestData;
  }

  const token = typeof headerToken === 'string' && headerToken.trim()
    ? headerToken.trim()
    : typeof bodyToken === 'string'
      ? bodyToken.trim()
      : '';
  return token;
}

function requirePlayIntegrity(action) {
  if (!PROTECTED_ACTIONS.includes(action)) throw new Error(`Unknown Play Integrity action: ${action}`);

  return async (req, res, next) => {
    const integrityToken = extractIntegrityToken(req);
    if (!isEnforcementEnabled()) {
      req.playIntegrity = { enforced: false, passed: true, verdict: 'NOT_ENFORCED' };
      return next();
    }
    if (integrityToken.length < 20 || integrityToken.length > TOKEN_MAX_LENGTH) {
      return res.status(403).json({
        error: 'Play Integrity verification required',
        code: 'PLAY_INTEGRITY_REQUIRED',
      });
    }

    try {
      const expectedRequestHash = buildRequestHash(action, req.body || {});
      const result = await verifyIntegrityToken(integrityToken, expectedRequestHash);
      req.playIntegrity = { enforced: true, ...result };
      if (!result.passed) {
        return res.status(403).json({
          error: 'Play Integrity verification failed',
          code: 'PLAY_INTEGRITY_FAILED',
          reasons: result.reasons,
        });
      }
      return next();
    } catch (error) {
      console.warn('[PlayIntegrity] verification unavailable:', error.code || error.name || 'Error');
      return res.status(503).json({
        error: 'Play Integrity verification unavailable',
        code: 'PLAY_INTEGRITY_UNAVAILABLE',
      });
    }
  };
}

router.post('/verify', authenticate, validateRequest({ body: verifySchema }), async (req, res) => {
  try {
    const expectedRequestHash = buildRequestHash(req.body.action, req.body.requestData);
    const result = await verifyIntegrityToken(req.body.integrityToken, expectedRequestHash);
    return res.status(result.passed ? 200 : 403).json(result);
  } catch (error) {
    console.warn('[PlayIntegrity] endpoint verification unavailable:', error.code || error.name || 'Error');
    return res.status(503).json({
      passed: false,
      verdict: 'ERROR',
      reasons: ['verification_unavailable'],
    });
  }
});

module.exports = router;
module.exports.PROTECTED_ACTIONS = PROTECTED_ACTIONS;
module.exports.buildRequestHash = buildRequestHash;
module.exports.evaluateTokenPayload = evaluateTokenPayload;
module.exports.extractIntegrityToken = extractIntegrityToken;
module.exports.isEnforcementEnabled = isEnforcementEnabled;
module.exports.requirePlayIntegrity = requirePlayIntegrity;
module.exports.stableStringify = stableStringify;
module.exports.verifyIntegrityToken = verifyIntegrityToken;
