const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

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
router.post('/validate', async (req, res) => {
  try {
    const { id: productId, transaction, additionalData } = req.body;

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

    if (!packageName) {
      return res.status(500).json({
        ok: false,
        error: 'Server configuration error: missing package name',
      });
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

    // Extract user ID from additionalData sent by the plugin
    const userId = additionalData?.userId;

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
        console.log(`Updated subscription for user ${userId}`);
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
  try {
    // Acknowledge receipt immediately (required by Pub/Sub)
    res.status(200).send('OK');

    // Parse Pub/Sub message
    const message = req.body.message;
    
    if (!message || !message.data) {
      console.error('Invalid Pub/Sub message format');
      return;
    }

    // Decode base64 message data
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    if (!notification.subscriptionNotification) {
      console.log('Not a subscription notification, ignoring');
      return;
    }

    const subNotification = notification.subscriptionNotification;
    const purchaseToken = subNotification.purchaseToken;
    const subscriptionId = subNotification.subscriptionId;
    const notificationType = subNotification.notificationType;

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
      return;
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
      console.error(`No user found with purchase token ${purchaseToken}`);
      return;
    }

    const user = usersResult.rows[0];
    const userId = user.id;

    // Handle different notification types
    let newStatus;
    
    switch (notificationType) {
      case 2: // SUBSCRIPTION_RENEWED
        newStatus = 'active';
        console.log(`Subscription renewed for user ${userId}, expiry: ${expiryTimeMillis}`);
        break;
      
      case 3: // SUBSCRIPTION_CANCELED
        newStatus = 'canceled';
        console.log(`Subscription canceled for user ${userId}`);
        break;
      
      case 13: // SUBSCRIPTION_EXPIRED
        newStatus = 'expired';
        console.log(`Subscription expired for user ${userId}`);
        break;
      
      default:
        console.log(`Unhandled notification type: ${notificationType}`);
        return;
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

    console.log(`Updated user ${userId} subscription status to ${newStatus}`);

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't throw - we already sent 200 response
  }
});

module.exports = router;
