/**
 * RevenueCat subscription sync — DROP-IN, NOT YET MOUNTED.
 *
 * Mount in server/server.js once your new API is ready, e.g.:
 *
 *     const revenueCatRoutes = require('./routes/revenueCatSubscriptions');
 *     app.use('/api/subscriptions/revenuecat', revenueCatRoutes);
 *
 * The Android client (src/context/RevenueCatContext.jsx) POSTs here after a
 * purchase/restore so the server can be the source of truth for premium.
 *
 * SECURITY: never trust the `customerInfo` blob from the client. We re-fetch
 * the subscriber from RevenueCat's REST API using the secret key, then mirror
 * the entitlement into our own users table.
 *
 * Required env:
 *   REVENUECAT_SECRET_KEY        – RevenueCat "Secret API key" (v1 REST)
 *   REVENUECAT_ENTITLEMENT_ID    – defaults to "premium"
 *
 * Conventions matched from existing routes:
 *   - `authenticate` middleware sets `req.userId`
 *   - Postgres access via `req.pool` (columns: is_premium,
 *     subscription_expires_at, subscription_plan)
 */

const express = require('express');
const crypto = require('crypto');
const authenticate = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { payments: paymentSchemas } = require('../validation/schemas');

const router = express.Router();

const RC_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY || '';
const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || 'premium';
const APP_USER_ID_PREFIX = 'nutriscan_';

/**
 * Fetch a subscriber from RevenueCat and return the premium entitlement
 * (or null). Uses global fetch (Node 18+).
 */
async function fetchEntitlement(appUserId) {
  if (!RC_SECRET_KEY) {
    throw new Error('REVENUECAT_SECRET_KEY is not configured');
  }
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${RC_SECRET_KEY}`,
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) {
    throw new Error(`RevenueCat API responded ${res.status}`);
  }
  const data = await res.json();
  const active = data?.subscriber?.entitlements?.[ENTITLEMENT_ID] || null;
  if (!active) return null;

  // expires_date is null for lifetime entitlements.
  const expires = active.expires_date ? new Date(active.expires_date) : null;
  const isActive = !expires || expires.getTime() > Date.now();
  return isActive ? { expires, raw: active } : null;
}

/**
 * POST /api/subscriptions/revenuecat/sync
 * Body: { appUserId, customerInfo }  (customerInfo is advisory only)
 */
router.post('/sync', authenticate, validateRequest({ body: paymentSchemas.revenueCatSync }), async (req, res) => {
  try {
    const userId = req.userId;
    const expectedAppUserId = `${APP_USER_ID_PREFIX}${userId}`;
    const { appUserId } = req.body || {};

    // Guard: the client must claim its own app-user-id.
    if (appUserId && appUserId !== expectedAppUserId) {
      return res.status(403).json({ error: 'appUserId does not match session user' });
    }

    const entitlement = await fetchEntitlement(expectedAppUserId);
    const isPremium = Boolean(entitlement);
    const expiresAt = entitlement?.expires ?? null;
    const plan = isPremium ? 'premium' : 'free';

    await req.pool.query(
      `UPDATE users
         SET is_premium = $1,
             subscription_plan = $2,
             subscription_expires_at = $3
       WHERE id = $4`,
      [isPremium, plan, expiresAt, userId],
    );

    return res.json({
      isPremium,
      subscriptionPlan: plan,
      subscriptionExpiresAt: expiresAt,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[revenuecat/sync] failed:', err);
    return res.status(500).json({ error: 'Failed to sync subscription' });
  }
});

/**
 * POST /api/subscriptions/revenuecat/webhook
 * Configure this URL in RevenueCat → Integrations → Webhooks for renewals,
 * cancellations and billing-recovery events. Protect with a shared bearer
 * token (RevenueCat lets you set an Authorization header).
 *
 * NOTE: mount this BEFORE any auth middleware — webhooks are server-to-server.
 */
router.post('/webhook', async (req, res) => {
  let eventId;
  try {
    const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
    const suppliedAuth = req.headers.authorization || '';
    if (!expected || suppliedAuth.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(suppliedAuth), Buffer.from(expected))) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
    const signatureHeader = req.headers['x-revenuecat-webhook-signature'];
    if (!signingSecret || typeof signatureHeader !== 'string' || !req.rawBody) {
      return res.status(401).json({ error: 'webhook signature required' });
    }
    const parts = Object.fromEntries(signatureHeader.split(',').map((part) => part.trim().split('=', 2)));
    const timestamp = Number(parts.t);
    const suppliedSignature = parts.v1 || '';
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
      return res.status(401).json({ error: 'stale webhook signature' });
    }
    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(`${parts.t}.`)
      .update(req.rawBody)
      .digest('hex');
    if (
      suppliedSignature.length !== expectedSignature.length
      || !crypto.timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))
    ) {
      return res.status(401).json({ error: 'invalid webhook signature' });
    }

    const event = req.body?.event;
    eventId = event?.id;
    if (!eventId || typeof eventId !== 'string' || eventId.length > 200) {
      return res.status(400).json({ error: 'invalid event id' });
    }
    const allowedAppIds = new Set((process.env.REVENUECAT_APP_IDS || '').split(',').map((v) => v.trim()).filter(Boolean));
    if (allowedAppIds.size > 0 && event.app_id && !allowedAppIds.has(event.app_id)) {
      return res.status(403).json({ error: 'unexpected RevenueCat app id' });
    }
    const appUserId = event?.app_user_id || '';
    if (!appUserId.startsWith(APP_USER_ID_PREFIX)) {
      return res.status(200).json({ ok: true, ignored: true });
    }
    const userId = appUserId.slice(APP_USER_ID_PREFIX.length);
    if (!/^\d+$/.test(userId)) return res.status(400).json({ error: 'invalid app user id' });

    const claimed = await req.pool.query(
      `INSERT INTO webhook_events (provider, event_id, status)
       VALUES ('revenuecat', $1, 'processing')
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING event_id`,
      [eventId],
    );
    if (claimed.rows.length === 0) return res.status(200).json({ ok: true, duplicate: true });

    const entitlement = await fetchEntitlement(appUserId);
    const isPremium = Boolean(entitlement);
    await req.pool.query(
      `UPDATE users
         SET is_premium = $1,
             subscription_plan = $2,
             subscription_expires_at = $3
       WHERE id = $4`,
      [isPremium, isPremium ? 'premium' : 'free', entitlement?.expires ?? null, userId],
    );

    await req.pool.query(
      "UPDATE webhook_events SET status = 'processed', processed_at = NOW() WHERE provider = 'revenuecat' AND event_id = $1",
      [eventId],
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[revenuecat/webhook] failed:', err);
    if (eventId) {
      await req.pool.query(
        "DELETE FROM webhook_events WHERE provider = 'revenuecat' AND event_id = $1",
        [eventId],
      ).catch(() => {});
    }
    return res.status(500).json({ error: 'webhook processing failed' });
  }
});

module.exports = router;
