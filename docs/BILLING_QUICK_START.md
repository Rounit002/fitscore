# Google Play Billing - Quick Start Guide

## 🚀 Quick Setup (5 Steps)

### 1. Install Dependencies ✅
```bash
cd server
npm install  # googleapis already added to package.json
```

### 2. Configure Environment Variables
Add to `server/.env`:
```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_PACKAGE_NAME=com.yourcompany.nutriscan
```

**Get Service Account JSON:**
1. Go to https://console.cloud.google.com/
2. IAM & Admin → Service Accounts → Create Key (JSON)
3. Enable "Google Play Android Developer API"

### 3. Install Cordova Plugin
```bash
cordova plugin add cordova-plugin-purchase@^13.0.0
```

### 4. Initialize in Your App
Add to `src/App.jsx`:
```jsx
import { initBilling, onSubscriptionActive } from './services/billingService';

useEffect(() => {
  if (window.cordova) {
    document.addEventListener('deviceready', async () => {
      await initBilling();
    });
  }
}, []);

onSubscriptionActive((userId, expiryDate) => {
  console.log('Subscription activated!');
  // Update app state
});
```

### 5. Use the Paywall
```jsx
import PaywallModal from './components/PaywallModal';

function MyComponent() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <button onClick={() => setShowPaywall(true)}>Upgrade</button>
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
        onSubscribed={() => console.log('Success!')}
      />
    </>
  );
}
```

## 📦 What Was Created

| File | Purpose |
|------|---------|
| `server/routes/billing.js` | Validates purchases & handles webhooks |
| `server/middleware/requireSubscription.js` | Gates premium features |
| `src/services/billingService.js` | Cordova billing integration |
| `src/components/PaywallModal.jsx` | Subscription purchase UI |
| `config.xml` | Cordova plugin configuration |

## 🔑 Key Endpoints

### POST /billing/validate
- Validates purchase tokens from app
- Called automatically by cordova-plugin-purchase
- Updates database with subscription data

### POST /billing/webhook
- Receives Google Pub/Sub notifications
- Handles renewals, cancellations, expirations
- NO authentication required (Google calls it)

## 🛡️ Protect Premium Features

Backend (Express):
```javascript
const requireSubscription = require('./middleware/requireSubscription');

router.get('/premium-feature', authenticate, requireSubscription, (req, res) => {
  // Only subscribers can access this
});
```

Frontend (React):
```jsx
import { hasActiveSubscription } from './services/billingService';

function PremiumContent() {
  const isPro = hasActiveSubscription();
  
  if (!isPro) return <PaywallModal />;
  
  return <div>Premium content here</div>;
}
```

## 📱 Product IDs (Update These!)

Current placeholders:
- `fitscan_pro_monthly`
- `fitscan_pro_annual`

Replace with your real SKUs from Google Play Console:
1. Update in `src/services/billingService.js`
2. Create products in Google Play Console
3. Match the IDs exactly

## 🔔 Setup Real-Time Notifications

1. **Create Pub/Sub Topic:**
   - Go to https://console.cloud.google.com/cloudpubsub
   - Create topic: `play-billing-notifications`

2. **Create Push Subscription:**
   - Topic: `play-billing-notifications`
   - Push endpoint: `https://your-api.com/billing/webhook`

3. **Configure in Google Play:**
   - Monetize → Monetization Setup
   - Enter topic name
   - Grant permissions to Google Play service account

## 🧪 Testing

### Test Purchase Flow
1. Add test account in Google Play Console → Setup → License Testing
2. Build and install app on device
3. Make test purchase (won't be charged)
4. Check logs: backend should validate and update database

### Test Webhook
Use Pub/Sub emulator or send manual test notification:
```bash
curl -X POST https://your-api.com/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": {"data": "base64_encoded_notification"}}'
```

## 📊 Database Schema

Stored in `users.profile` JSONB:
```json
{
  "subscription_status": "active",
  "subscription_expiry": 1234567890000,
  "subscription_product_id": "fitscan_pro_monthly",
  "purchase_token": "google_play_token"
}
```

## ⚠️ Common Issues

### "Billing not available"
- Testing on real device? (not browser)
- Called `initBilling()` after deviceready?
- Plugin installed correctly?

### "Validation failed"
- Service account JSON correct?
- Google Play API enabled?
- Package name matches?

### Webhook not receiving
- URL publicly accessible?
- Returns HTTP 200?
- Pub/Sub subscription configured?

## 📚 Full Documentation

- **Complete Guide**: `BILLING_INTEGRATION_GUIDE.md`
- **Code Examples**: `BILLING_USAGE_EXAMPLES.md`
- **Implementation Details**: `BILLING_IMPLEMENTATION_SUMMARY.md`

## 🎯 Production Checklist

Before going live:
- [ ] Replace placeholder product IDs
- [ ] Configure production webhook URL (HTTPS)
- [ ] Test with license testing accounts
- [ ] Verify database updates work
- [ ] Test subscription expiry enforcement
- [ ] Add "Restore Purchases" button
- [ ] Monitor logs for errors
- [ ] Test webhook delivery

---

**Need help?** Check the detailed guides or refer to:
- [Google Play Billing Docs](https://developer.android.com/google/play/billing)
- [Cordova Plugin Docs](https://github.com/j3k0/cordova-plugin-purchase)
