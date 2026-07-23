# Billing Integration Usage Examples

This file contains practical examples of how to integrate the Google Play Billing system into your NutriScan app.

## 1. Initialize Billing in Your App

Add this to your main `App.jsx` file:

```jsx
import { useEffect, useState } from 'react';
import { initBilling, onSubscriptionActive, hasActiveSubscription } from './services/billingService';

function App() {
  const [billingReady, setBillingReady] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    // Initialize billing when running in Cordova
    if (window.cordova) {
      document.addEventListener('deviceready', async () => {
        console.log('Device ready, initializing billing...');
        const success = await initBilling();
        
        if (success) {
          console.log('Billing initialized successfully');
          setBillingReady(true);
          
          // Check if user already has a subscription
          const hasActive = hasActiveSubscription();
          setHasSubscription(hasActive);
        } else {
          console.error('Failed to initialize billing');
        }
      }, false);
    }
  }, []);

  // Set callback for when subscription becomes active
  useEffect(() => {
    onSubscriptionActive((userId, expiryDate) => {
      console.log(`Subscription activated for user ${userId}`);
      console.log(`Expires: ${new Date(expiryDate)}`);
      
      // Update local state
      setHasSubscription(true);
      
      // Optionally: Refresh user data from backend
      // fetchUserProfile();
    });
  }, []);

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}

export default App;
```

## 2. Show Paywall for Premium Features

Create a hook to check subscription status:

```jsx
// hooks/useSubscription.js
import { useState, useEffect } from 'react';
import { hasActiveSubscription } from '../services/billingService';
import api from '../api/client';

export function useSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      // First check local Cordova state
      if (window.cordova) {
        const hasLocal = hasActiveSubscription();
        if (hasLocal) {
          setIsPro(true);
          setLoading(false);
          return;
        }
      }

      // Then verify with backend
      const response = await api.get('/api/user/subscription-status');
      const { isActive, expiryDate } = response.data;
      
      if (isActive && expiryDate > Date.now()) {
        setIsPro(true);
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isPro, loading, refreshStatus: checkSubscriptionStatus };
}
```

Use the hook in your components:

```jsx
import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

function PremiumFeature() {
  const { isPro, loading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isPro) {
    return (
      <>
        <div className="premium-locked">
          <h2>Premium Feature</h2>
          <p>Upgrade to Pro to unlock this feature</p>
          <button onClick={() => setShowPaywall(true)}>
            Upgrade Now
          </button>
        </div>

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSubscribed={() => {
            setShowPaywall(false);
            // Refresh the page or update state
            window.location.reload();
          }}
        />
      </>
    );
  }

  return (
    <div className="premium-content">
      {/* Your premium feature content */}
      <h2>Premium Feature Active</h2>
    </div>
  );
}

export default PremiumFeature;
```

## 3. Add "Upgrade" Button in Settings

```jsx
import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';
import { Crown, Check } from 'lucide-react';

function SettingsPage() {
  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {/* Subscription Card */}
      <div className="settings-card">
        <div className="flex items-center gap-3">
          <Crown className={`w-6 h-6 ${isPro ? 'text-yellow-500' : 'text-gray-400'}`} />
          <div className="flex-1">
            <h3 className="font-semibold">
              {isPro ? 'Pro Subscription' : 'Free Plan'}
            </h3>
            <p className="text-sm text-gray-600">
              {isPro 
                ? 'You have access to all premium features'
                : 'Upgrade to unlock unlimited scans and advanced features'
              }
            </p>
          </div>
          {isPro ? (
            <Check className="w-6 h-6 text-green-500" />
          ) : (
            <button
              onClick={() => setShowPaywall(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Other settings */}
      {/* ... */}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribed={() => {
          setShowPaywall(false);
          // Optionally refresh user data
        }}
      />
    </div>
  );
}

export default SettingsPage;
```

## 4. Gate Backend API Calls

On the backend, protect premium endpoints:

```javascript
// server/routes/premiumFeatures.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireSubscription = require('../middleware/requireSubscription');

// Free endpoint - no subscription required
router.get('/basic-feature', authenticate, async (req, res) => {
  res.json({ message: 'This is available to all users' });
});

// Premium endpoint - subscription required
router.get('/advanced-analysis', authenticate, requireSubscription, async (req, res) => {
  // Only users with active subscriptions can access this
  res.json({
    message: 'Premium analysis data',
    data: {
      // Advanced features
    }
  });
});

module.exports = router;
```

## 5. Check Subscription Status on Frontend

Add an endpoint to check subscription status:

```javascript
// server/routes/user.js - Add this endpoint
router.get('/subscription-status', authenticate, async (req, res) => {
  try {
    const userResult = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = userResult.rows[0].profile || {};
    const status = profile.subscription_status;
    const expiry = profile.subscription_expiry;

    const isActive = status === 'active' && expiry > Date.now();

    res.json({
      isActive,
      status,
      expiryDate: expiry,
      productId: profile.subscription_product_id,
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
```

Frontend API call:

```javascript
// src/api/client.js - Add this function
export async function checkSubscriptionStatus() {
  try {
    const response = await fetch('/api/user/subscription-status', {
      credentials: 'include', // Include cookies for JWT
    });

    if (!response.ok) {
      throw new Error('Failed to check subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Subscription check failed:', error);
    return { isActive: false };
  }
}
```

## 6. Restore Purchases

Add a "Restore Purchases" button for users who reinstalled the app:

```jsx
import { useState } from 'react';
import { restorePurchases } from '../services/billingService';
import { RefreshCw } from 'lucide-react';

function RestorePurchasesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRestore = async () => {
    setLoading(true);
    setMessage('');

    try {
      const success = await restorePurchases();
      
      if (success) {
        setMessage('Purchases restored successfully!');
        // Refresh app state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage('No purchases found to restore');
      }
    } catch (error) {
      setMessage('Failed to restore purchases');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restore-purchases">
      <button
        onClick={handleRestore}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Restoring...' : 'Restore Purchases'}
      </button>
      {message && (
        <p className={`text-sm mt-2 ${message.includes('success') ? 'text-green-600' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default RestorePurchasesButton;
```

## 7. Show Subscription Details in Profile

```jsx
import { useEffect, useState } from 'react';
import { checkSubscriptionStatus } from '../api/client';

function SubscriptionDetails() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await checkSubscriptionStatus();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!subscription?.isActive) {
    return <div>No active subscription</div>;
  }

  const expiryDate = new Date(subscription.expiryDate);
  const planName = subscription.productId?.includes('annual') ? 'Annual' : 'Monthly';

  return (
    <div className="subscription-details">
      <h3>Your Subscription</h3>
      <div className="details">
        <p>
          <strong>Plan:</strong> {planName} Pro
        </p>
        <p>
          <strong>Status:</strong> {subscription.status}
        </p>
        <p>
          <strong>Renews on:</strong> {expiryDate.toLocaleDateString()}
        </p>
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Manage your subscription in the Google Play Store app.
      </p>
    </div>
  );
}

export default SubscriptionDetails;
```

## 8. Handle Subscription Errors Gracefully

```jsx
import { purchaseSubscription } from '../services/billingService';
import { AlertCircle } from 'lucide-react';

function handlePurchaseError(error) {
  const errorMessages = {
    'USER_CANCELLED': 'Purchase was cancelled',
    'ITEM_ALREADY_OWNED': 'You already own this subscription',
    'ITEM_UNAVAILABLE': 'This subscription is not available',
    'PAYMENT_INVALID': 'Payment method declined',
  };

  const message = errorMessages[error.code] || error.message || 'Purchase failed';

  return (
    <div className="error-message flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
      <AlertCircle className="w-5 h-5" />
      <span>{message}</span>
    </div>
  );
}

export default handlePurchaseError;
```

## 9. Testing Checklist

Before going to production, test:

- [ ] Purchase flow completes successfully
- [ ] Validation endpoint receives and processes purchase
- [ ] Database updates with subscription data
- [ ] Webhook receives and processes Google notifications
- [ ] Subscription expiry is checked correctly
- [ ] `requireSubscription` middleware blocks non-subscribers
- [ ] Restore purchases works for existing customers
- [ ] Error handling displays user-friendly messages
- [ ] Subscription status syncs between app and backend

## 10. Production Deployment

1. **Update Product IDs**: Replace `fitscan_pro_monthly` and `fitscan_pro_annual` with your actual Google Play product IDs
2. **Configure webhook URL**: Update Google Pub/Sub subscription with production URL
3. **Set environment variables**: Add production values for `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_PACKAGE_NAME`
4. **Test with license testers**: Use Google Play Console license testing before public release
5. **Monitor logs**: Watch for webhook delivery, validation errors, and database updates
6. **Handle edge cases**: Grace periods, subscription changes, refunds

---

For more details, see `BILLING_INTEGRATION_GUIDE.md`.
