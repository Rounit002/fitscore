const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const authenticate = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { payments: paymentSchemas } = require('../validation/schemas');

// Initialize Google Play Developer API client
function getGooglePlayClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }

  const credentials = JSON.parse(serviceAccountJson);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  return google.androidpublisher({
    version: 'v3',
    auth,
  });
}

// POST /billing/validate - Validates purchase token from cordova-plugin-purchase
router.post('/validate', authenticate, validateRequest({ body: paymentSchemas.legacyBillingValidate }), async (req, res) => {
  try {
    const { id: productId, transaction } = req.body;

    if (!transaction || !transaction.purchaseToken) {
      return res.status(400).json({
        ok: false,
        error: 'Missing purchase token',
      });
    }

    if (!productId) {
      return res.status(400).json({
        ok: false,
        error: 'Missing product ID',
      });
    }

    const purchaseToken = transaction.purchaseToken;
    const packageName = process.env.GOOGLE_PACKAGE_NAME;
    const allowedProducts = new Set((process.env.GOOGLE_SUBSCRIPTION_IDS || '').split(',').map((v) => v.trim()).filter(Boolean));

    if (!packageName) {
      return res.status(500).json({
        ok: false,
        error: 'Server configuration error: missing package name',
      });
    }
    if (allowedProducts.size > 0 && !allowedProducts.has(productId)) {
      return res.status(400).json({ ok: false, error: 'Unknown subscription product' });
    }

    // Verify purchase with Google Play API
    const androidPublisher = getGooglePlayClient();
    
    let subscriptionData;
    try {
      const response = await androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      subscriptionData = response.data;
    } catch (googleError) {
      console.error('Google Play API validation error:', googleError);
      return res.status(400).json({
        ok: false,
        error: 'Purchase validation failed',
      });
    }

    // Check if subscription is valid
    const expiryTimeMillis = parseInt(subscriptionData.expiryTimeMillis);
    const now = Date.now();

    if (expiryTimeMillis < now) {
      return res.status(400).json({
        ok: false,
        error: 'Subscription expired',
      });
    }

    // Bind the purchase to the authenticated account. Client-supplied user IDs
    // are intentionally ignored to prevent subscription IDOR.
    const userId = req.userId;

    if (userId) {
      // Update user subscription status in database using raw pg pool
      try {
        await req.pool.query(
          `UPDATE users 
           SET profile = jsonb_set(
             jsonb_set(
               jsonb_set(
                 jsonb_set(
                   COALESCE(profile, '{}'::jsonb),
                   '{subscription_status}',
                   '"active"'
                 ),
                 '{subscription_expiry}',
                 to_jsonb($1::bigint)
               ),
               '{subscription_product_id}',
               to_jsonb($2::text)
             ),
             '{purchase_token}',
             to_jsonb($3::text)
           )
           WHERE id = $4`,
          [expiryTimeMillis, productId, purchaseToken, userId]
        );
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Still return success to the plugin, as the purchase is valid
      }
    }

    // Return success in the format expected by cordova-plugin-purchase
    return res.json({
      ok: true,
      data: {
        id: productId,
        expiryDate: expiryTimeMillis,
      },
    });

  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
});

// POST /billing/webhook - Google Pub/Sub RTDN (Real-time Developer Notifications)
router.post('/webhook', async (req, res) => {
  let eventId;
  try {
    const audience = process.env.GOOGLE_RTDN_AUDIENCE;
    const serviceAccount = process.env.GOOGLE_RTDN_SERVICE_ACCOUNT;
    const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!audience || !serviceAccount || !bearer) {
      return res.status(401).json({ error: 'Webhook authentication required' });
    }

    const verifier = new google.auth.OAuth2();
    const ticket = await verifier.verifyIdToken({ idToken: bearer, audience });
    const payload = ticket.getPayload() || {};
    if (payload.email !== serviceAccount || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Invalid webhook identity' });
    }

    // Parse Pub/Sub message
    const message = req.body.message;
    
    if (!message || typeof message.data !== 'string') {
      return res.status(400).json({ error: 'Invalid Pub/Sub message format' });
    }
    if (message.data.length > 100_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(message.data)) {
      return res.status(400).json({ error: 'Invalid Pub/Sub message data' });
    }

    eventId = String(message.messageId || message.message_id || '');
    if (!eventId || eventId.length > 255 || !/^[A-Za-z0-9._:-]+$/.test(eventId)) {
      return res.status(400).json({ error: 'Invalid Pub/Sub message id' });
    }
    const claimed = await req.pool.query(
      `INSERT INTO webhook_events (provider, event_id, status)
       VALUES ('google_play', $1, 'processing')
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING event_id`,
      [eventId],
    );
    if (claimed.rows.length === 0) return res.status(200).json({ ok: true, duplicate: true });

    // Decode base64 message data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    if (!notification.subscriptionNotification) {
      await req.pool.query(
        "UPDATE webhook_events SET status = 'ignored', processed_at = NOW() WHERE provider = 'google_play' AND event_id = $1",
        [eventId],
      );
      return res.status(200).json({ ok: true, ignored: true });
    }

    const subNotification = notification.subscriptionNotification;
    const purchaseToken = subNotification.purchaseToken;
    const subscriptionId = subNotification.subscriptionId;
    const notificationType = subNotification.notificationType;
    const allowedProducts = new Set((process.env.GOOGLE_SUBSCRIPTION_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean));

    if (
      typeof purchaseToken !== 'string'
      || purchaseToken.length < 10
      || purchaseToken.length > 4_096
      || typeof subscriptionId !== 'string'
      || subscriptionId.length > 255
      || !Number.isInteger(notificationType)
      || (allowedProducts.size > 0 && !allowedProducts.has(subscriptionId))
    ) {
      await req.pool.query(
        "UPDATE webhook_events SET status = 'rejected', processed_at = NOW() WHERE provider = 'google_play' AND event_id = $1",
        [eventId],
      );
      return res.status(400).json({ error: 'Invalid subscription notification' });
    }

    console.log(`Received notification type ${notificationType} for subscription ${subscriptionId}`);

    // Fetch latest subscription state from Google Play API
    const packageName = process.env.GOOGLE_PACKAGE_NAME;
    const androidPublisher = getGooglePlayClient();

    let subscriptionData;
    try {
      const response = await androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId,
        token: purchaseToken,
      });
      subscriptionData = response.data;
    } catch (googleError) {
      console.error('Failed to fetch subscription from Google Play:', googleError);
      throw googleError;
    }

    const expiryTimeMillis = parseInt(subscriptionData.expiryTimeMillis);

    // Find user by purchase token
    const usersResult = await req.pool.query(
      `SELECT id, profile
       FROM users
       WHERE profile->>'purchase_token' = $1`,
      [purchaseToken]
    );

    if (!usersResult.rows || usersResult.rows.length === 0) {
      console.error('No user found for verified Google Play purchase token');
      await req.pool.query(
        "UPDATE webhook_events SET status = 'ignored', processed_at = NOW() WHERE provider = 'google_play' AND event_id = $1",
        [eventId],
      );
      return res.status(200).json({ ok: true, ignored: true });
    }

    const user = usersResult.rows[0];
    const userId = user.id;

    // Handle different notification types
    let newStatus;
    
    switch (notificationType) {
      case 2: // SUBSCRIPTION_RENEWED
        newStatus = 'active';
        console.log('A Google Play subscription was renewed');
        break;
      
      case 3: // SUBSCRIPTION_CANCELED
        newStatus = 'canceled';
        console.log('A Google Play subscription was canceled');
        break;
      
      case 13: // SUBSCRIPTION_EXPIRED
        newStatus = 'expired';
        console.log('A Google Play subscription expired');
        break;
      
      default:
        console.log(`Unhandled notification type: ${notificationType}`);
        await req.pool.query(
          "UPDATE webhook_events SET status = 'ignored', processed_at = NOW() WHERE provider = 'google_play' AND event_id = $1",
          [eventId],
        );
        return res.status(200).json({ ok: true, ignored: true });
    }

    // Update user subscription status in database
    await req.pool.query(
      `UPDATE users 
       SET profile = jsonb_set(
         jsonb_set(
           COALESCE(profile, '{}'::jsonb),
           '{subscription_status}',
           to_jsonb($1::text)
         ),
         '{subscription_expiry}',
         to_jsonb($2::bigint)
       )
       WHERE id = $3`,
      [newStatus, expiryTimeMillis, userId]
    );

    await req.pool.query(
      "UPDATE webhook_events SET status = 'processed', processed_at = NOW() WHERE provider = 'google_play' AND event_id = $1",
      [eventId],
    );
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    if (eventId) {
      await req.pool.query(
        "DELETE FROM webhook_events WHERE provider = 'google_play' AND event_id = $1",
        [eventId],
      ).catch(() => {});
    }
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
