# Google Play Billing Integration Guide

This document explains how to set up and use Google Play Billing subscriptions in NutriScan.

## Architecture Overview

- **Frontend**: React + Vite running inside Cordova WebView (Android APK)
- **Backend**: Node.js + Express REST API
- **Billing Plugin**: `cordova-plugin-purchase` v13+
- **Validation**: Google Play Developer API via `googleapis` npm package

## File Structure

```
server/
├── routes/
│   └── billing.js              # Billing validation & webhook endpoints
├── middleware/
│   └── requireSubscription.js  # Middleware to gate premium features
└── .env                        # Environment configuration

src/
├── services/
│   └── billingService.js       # Cordova billing logic
└── components/
    └── PaywallModal.jsx        # Subscription purchase UI

config.xml                       # Cordova plugin configuration
```

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies

```bash
cd server
npm install googleapis
```

#### Configure Environment Variables

Add the following to `server/.env`:

```env
# Google Play Billing Configuration
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
GOOGLE_PACKAGE_NAME=com.yourcompany.nutriscan
```

**Getting the Service Account JSON:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin > Service Accounts**
3. Create a new service account or select an existing one
4. Click **Add Key > Create New Key > JSON**
5. Download the JSON file
6. Stringify it (remove newlines) and paste into the env var

**Required Permissions:**
- The service account needs the `androidpublisher` API permission
- Enable the **Google Play Android Developer API** in your Google Cloud project

### 2. Frontend Setup

#### Install Cordova Plugin

The `cordova-plugin-purchase` plugin is already configured in `config.xml`:

```xml
<plugin name="cordova-plugin-purchase" spec="^13.0.0" />
```

To install it:

```bash
cordova plugin add cordova-plugin-purchase@^13.0.0
```

#### Initialize Billing on App Start

In your main app file (e.g., `App.jsx`), initialize billing after Cordova is ready:

```javascript
import { initBilling, onSubscriptionActive } from './services/billingService';

useEffect(() => {
  if (window.cordova) {
    document.addEventListener('deviceready', async () => {
      const success = await initBilling();
      if (success) {
        console.log('Billing initialized');
      }
    });
  }
}, []);

// Set up callback for successful subscriptions
onSubscriptionActive((userId, expiryDate) => {
  console.log(`Subscription active for user ${userId} until ${new Date(expiryDate)}`);
  // Update app state, refresh user data, etc.
});
```

### 3. Google Play Console Setup

#### Create Subscription Products

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your app
3. Navigate to **Monetize > Subscriptions**
4. Create two subscription products:
   - **Product ID**: `fitscan_pro_monthly`
   - **Product ID**: `fitscan_pro_annual`
5. Set pricing, billing periods, and descriptions

#### Set Up Real-Time Developer Notifications (RTDN)

1. In Google Play Console, go to **Monetize > Monetization Setup**
2. Under **Real-time developer notifications**, click **Edit**
3. Create a Google Cloud Pub/Sub topic (if you don't have one):
   - Go to [Cloud Pub/Sub](https://console.cloud.google.com/cloudpubsub)
   - Create a new topic (e.g., `play-billing-notifications`)
4. Set up a Pub/Sub push subscription:
   - Topic: `play-billing-notifications`
   - Push endpoint: `https://your-api-domain.com/billing/webhook`
   - No authentication required (endpoint validates via Google signature)
5. Grant the Google Play service account publish permissions on the topic

### 4. Testing

#### Test with Google Play License Testing

1. In Google Play Console, go to **Setup > License Testing**
2. Add test Google accounts
3. These accounts can make test purchases without being charged

#### Test Purchase Flow

```javascript
import { purchaseSubscription, PRODUCT_IDS } from './services/billingService';

// In your component
const handleBuyMonthly = async () => {
  try {
    await purchaseSubscription(PRODUCT_IDS.MONTHLY);
    console.log('Purchase initiated');
  } catch (error) {
    console.error('Purchase failed:', error);
  }
};
```

### 5. Using the Paywall Modal

```javascript
import PaywallModal from './components/PaywallModal';

function MyComponent() {
  const [showPaywall, setShowPaywall] = useState(false);

  const handleSubscribed = () => {
    console.log('User subscribed!');
    // Refresh user data, update UI, etc.
  };

  return (
    <>
      <button onClick={() => setShowPaywall(true)}>
        Upgrade to Pro
      </button>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribed={handleSubscribed}
      />
    </>
  );
}
```

### 6. Gating Premium Features

Use the `requireSubscription` middleware to protect premium endpoints:

```javascript
const authenticate = require('./middleware/auth');
const requireSubscription = require('./middleware/requireSubscription');

// Premium feature - requires active subscription
router.get('/premium-feature', authenticate, requireSubscription, async (req, res) => {
  // Only users with active subscriptions can access this
  res.json({ data: 'Premium content' });
});
```

The middleware checks:
1. `user.profile.subscription_status === 'active'`
2. `user.profile.subscription_expiry > Date.now()`

## API Endpoints

### POST /billing/validate

Validates purchase tokens from the Cordova plugin.

**Request** (sent automatically by cordova-plugin-purchase):
```json
{
  "id": "fitscan_pro_monthly",
  "transaction": {
    "type": "android-playstore",
    "purchaseToken": "...",
    "signature": "...",
    "receipt": "..."
  },
  "additionalData": {
    "userId": "123"
  }
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "id": "fitscan_pro_monthly",
    "expiryDate": 1234567890000
  }
}
```

### POST /billing/webhook

Receives real-time notifications from Google Play about subscription changes.

**Handled notification types:**
- Type 2: `SUBSCRIPTION_RENEWED` → Updates expiry in database
- Type 3: `SUBSCRIPTION_CANCELED` → Marks subscription as canceled
- Type 13: `SUBSCRIPTION_EXPIRED` → Marks subscription as expired

This endpoint does NOT require authentication (called by Google Pub/Sub).

## Database Schema

Subscription data is stored in the `users.profile` JSONB column:

```json
{
  "subscription_status": "active",
  "subscription_expiry": 1234567890000,
  "subscription_product_id": "fitscan_pro_monthly",
  "purchase_token": "..."
}
```

**Fields:**
- `subscription_status`: `"active"`, `"canceled"`, `"expired"`, or `null`
- `subscription_expiry`: Unix timestamp in milliseconds
- `subscription_product_id`: Product ID of the subscription
- `purchase_token`: Google Play purchase token (used for webhook lookups)

## Troubleshooting

### "Billing not available or not initialized"

- Make sure you're testing on a real Android device (not web browser)
- Ensure `initBilling()` was called after the `deviceready` event
- Check that `cordova-plugin-purchase` is installed

### "Purchase validation failed"

- Verify `GOOGLE_SERVICE_ACCOUNT_JSON` is correct
- Ensure the service account has `androidpublisher` API access
- Check that the product ID matches the one in Google Play Console
- Confirm the `GOOGLE_PACKAGE_NAME` matches your app's package name

### Webhook not receiving notifications

- Verify the webhook URL is publicly accessible (use ngrok for local testing)
- Check Pub/Sub subscription is configured correctly
- Ensure the endpoint returns HTTP 200 (even on errors)
- Check Google Cloud Pub/Sub logs for delivery failures

### Subscription not updating in database

- Check server logs for database errors
- Verify the `userId` is being passed in `additionalData`
- Ensure the user exists in the database
- Check that the `profile` column can store JSONB

## Security Considerations

1. **Always validate server-side**: Never trust client-only purchase verification
2. **Use HTTPS**: The webhook endpoint must use HTTPS in production
3. **Validate signatures**: The Google Play API validates purchase authenticity
4. **Store purchase tokens securely**: They're needed for webhook lookups
5. **Handle webhook idempotency**: Pub/Sub may deliver messages multiple times

## Next Steps

1. Replace placeholder product IDs with real SKUs
2. Set up production webhook endpoint
3. Test the full purchase flow with license testers
4. Monitor webhook delivery and database updates
5. Add user-facing subscription management UI
6. Implement restore purchases for existing customers

## Support

For issues related to:
- **Cordova plugin**: https://github.com/j3k0/cordova-plugin-purchase
- **Google Play Billing**: https://developer.android.com/google/play/billing
- **Google Play Developer API**: https://developers.google.com/android-publisher
