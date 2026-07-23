# Google Play Billing - Testing Checklist

Use this checklist to verify your billing integration is working correctly.

## 📋 Pre-Testing Setup

### Google Cloud Setup
- [ ] Google Cloud project created
- [ ] Google Play Android Developer API enabled
- [ ] Service account created with `androidpublisher` permission
- [ ] Service account JSON key downloaded
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` added to `.env`
- [ ] `GOOGLE_PACKAGE_NAME` matches app package name

### Google Play Console Setup
- [ ] Test subscription products created
  - [ ] Monthly subscription: `fitscan_pro_monthly` (or your SKU)
  - [ ] Annual subscription: `fitscan_pro_annual` (or your SKU)
- [ ] Subscriptions are in "Active" state
- [ ] License testing account(s) added
- [ ] Pub/Sub topic created for RTDN
- [ ] Push subscription configured with webhook URL
- [ ] Google Play service account granted publish permissions

### Backend Setup
- [ ] `googleapis` package installed (`npm install` in server/)
- [ ] Server running without errors
- [ ] `/billing/validate` endpoint accessible
- [ ] `/billing/webhook` endpoint accessible (publicly if testing RTDN)
- [ ] Database schema supports JSONB in `users.profile`
- [ ] Environment variables loaded correctly

### Frontend Setup
- [ ] `cordova-plugin-purchase` installed
- [ ] `config.xml` includes plugin declaration
- [ ] `billingService.js` imports without errors
- [ ] `PaywallModal.jsx` renders correctly
- [ ] `initBilling()` called after deviceready
- [ ] API base URL configured correctly

### Device Setup
- [ ] Testing on real Android device (not emulator if possible)
- [ ] Device has Google Play Store installed
- [ ] Logged in with license testing account
- [ ] App built and installed via APK or Cordova

---

## 🧪 Functional Testing

### 1. Billing Initialization
- [ ] App starts without crashes
- [ ] Console shows "Billing initialized successfully"
- [ ] No errors in browser/device console
- [ ] Products load from Google Play

### 2. Product Information
- [ ] Monthly product displays with price
- [ ] Annual product displays with price
- [ ] Prices are correct for test account's region
- [ ] Product titles and descriptions show correctly

### 3. Purchase Flow - Monthly Subscription
- [ ] Click "Subscribe" button opens Google Play purchase dialog
- [ ] Google Play shows correct product and price
- [ ] Complete purchase (test account won't be charged)
- [ ] Loading state shows during processing
- [ ] Success state shows after completion
- [ ] Modal closes automatically after success

### 4. Purchase Flow - Annual Subscription
- [ ] Click "Subscribe" button for annual plan
- [ ] Google Play shows correct product and price
- [ ] Complete purchase successfully
- [ ] App responds correctly

### 5. Backend Validation
- [ ] Check server logs for validation request
- [ ] Validation endpoint receives purchase token
- [ ] Google Play API call succeeds
- [ ] Database updated with subscription data:
  ```sql
  SELECT profile FROM users WHERE id = <user_id>;
  ```
  Should show:
  ```json
  {
    "subscription_status": "active",
    "subscription_expiry": 1234567890000,
    "subscription_product_id": "fitscan_pro_monthly",
    "purchase_token": "..."
  }
  ```
- [ ] Validation returns success to plugin

### 6. Subscription State
- [ ] `hasActiveSubscription()` returns `true`
- [ ] Premium features unlock
- [ ] `requireSubscription` middleware allows access
- [ ] Subscription status API returns correct data

### 7. Error Handling
- [ ] Cancel purchase - app shows cancellation message
- [ ] Purchase with no payment method - shows error
- [ ] Network error during validation - shows error
- [ ] Invalid product ID - shows error
- [ ] All errors are user-friendly (no technical jargon)

### 8. Restore Purchases
- [ ] "Restore Purchases" button visible
- [ ] Click button shows loading state
- [ ] Restores existing subscription
- [ ] Shows success message
- [ ] Subscription state updates in app

### 9. Multiple Purchases
- [ ] Cannot purchase same product twice (shows "already owned")
- [ ] Can upgrade from monthly to annual (if supported)
- [ ] Old subscription handled correctly

### 10. Premium Feature Access
- [ ] Premium endpoint without subscription → 403 error
- [ ] Premium endpoint with active subscription → success
- [ ] Frontend checks subscription before showing content
- [ ] Non-subscribers see paywall

---

## 🔔 Webhook Testing

### 11. Webhook Connectivity
- [ ] Webhook URL is publicly accessible
- [ ] Returns HTTP 200 on POST request
- [ ] Logs show incoming requests
- [ ] Handles malformed JSON gracefully

### 12. Subscription Renewed (Type 2)
- [ ] Send test notification with type 2
- [ ] Backend fetches latest subscription state
- [ ] Database updated with new expiry date
- [ ] Logs show "Subscription renewed"

### 13. Subscription Canceled (Type 3)
- [ ] Send test notification with type 3
- [ ] Database updated: `subscription_status = 'canceled'`
- [ ] User still has access until expiry
- [ ] Logs show "Subscription canceled"

### 14. Subscription Expired (Type 13)
- [ ] Send test notification with type 13
- [ ] Database updated: `subscription_status = 'expired'`
- [ ] User loses access immediately
- [ ] Logs show "Subscription expired"

### 15. Webhook Edge Cases
- [ ] Unknown notification type → logged and ignored
- [ ] Missing purchase token → logged and skipped
- [ ] User not found → logged error
- [ ] Duplicate notification → handled idempotently
- [ ] Google API error → logged, webhook returns 200

---

## 🔒 Security Testing

### 16. Validation Security
- [ ] Cannot bypass validation with fake purchase token
- [ ] Invalid signatures rejected
- [ ] Expired purchases rejected
- [ ] Validation requires server-side check

### 17. Authorization
- [ ] Cannot access premium features by manipulating frontend
- [ ] Backend always checks subscription on server
- [ ] JWT required for premium endpoints
- [ ] Webhook doesn't require JWT (correct behavior)

### 18. Data Integrity
- [ ] Subscription data stored correctly in database
- [ ] Purchase tokens match between Google and database
- [ ] Expiry timestamps are accurate
- [ ] Status transitions follow correct logic

---

## 📱 User Experience Testing

### 19. UI/UX
- [ ] Paywall modal is visually appealing
- [ ] Plans are easy to compare
- [ ] Prices and benefits are clear
- [ ] Loading states are smooth
- [ ] Error messages are helpful
- [ ] Success feedback is clear

### 20. Navigation
- [ ] Modal can be closed with X button
- [ ] Background click doesn't close (or does, if desired)
- [ ] Modal doesn't block app navigation
- [ ] Can access paywall from multiple screens

### 21. Responsive Design
- [ ] Modal looks good on small phones
- [ ] Modal looks good on tablets
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] No layout overflow

---

## 🌐 Cross-Platform Testing

### 22. Cordova Environment
- [ ] Works in Cordova WebView
- [ ] Billing service initializes correctly
- [ ] Google Play plugin accessible
- [ ] Device APIs available

### 23. Web Fallback
- [ ] App doesn't crash in web browser
- [ ] `window.cordova` check prevents errors
- [ ] Billing disabled message (optional)
- [ ] Other features still work

---

## 📊 Database Testing

### 24. Database Schema
- [ ] `users.profile` column is JSONB type
- [ ] Can store subscription data
- [ ] Can query subscription status efficiently
- [ ] Indexes work correctly (if any)

### 25. Data Queries
- [ ] Can find users by subscription status
- [ ] Can find users by purchase token
- [ ] Can find expired subscriptions
- [ ] Query performance is acceptable

---

## 🚀 Pre-Production Testing

### 26. Performance
- [ ] Billing initialization is fast
- [ ] Purchase flow is smooth
- [ ] Webhook processes quickly (<1s)
- [ ] No memory leaks
- [ ] No excessive API calls

### 27. Reliability
- [ ] Handles intermittent network issues
- [ ] Retries failed validations appropriately
- [ ] Doesn't duplicate purchases
- [ ] Webhook handles retries correctly

### 28. Monitoring
- [ ] Server logs purchase attempts
- [ ] Server logs validation results
- [ ] Server logs webhook deliveries
- [ ] Errors are captured and reported
- [ ] Can track subscription metrics

### 29. Edge Cases
- [ ] User with no internet during purchase
- [ ] Server down during validation
- [ ] Google Play API timeout
- [ ] Multiple rapid purchase attempts
- [ ] Concurrent webhook notifications

### 30. Final Production Check
- [ ] All placeholder product IDs replaced
- [ ] Production webhook URL configured
- [ ] Production Google Cloud credentials set
- [ ] HTTPS enabled for all endpoints
- [ ] Rate limiting configured
- [ ] Error monitoring active
- [ ] Backup/recovery plan in place

---

## ✅ Sign-Off

### Development Team
- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Code reviewed
- [ ] No known critical bugs

### QA Team
- [ ] Functional testing complete
- [ ] Security testing complete
- [ ] Performance testing complete
- [ ] Test report generated

### Product Owner
- [ ] User experience approved
- [ ] Pricing verified
- [ ] Terms and policies reviewed
- [ ] Ready for production

---

## 📝 Test Log Template

Use this for each test session:

```
Date: _______________
Tester: _______________
Device: _______________
OS Version: _______________
App Version: _______________
Test Account: _______________

Tests Passed: _____ / _____
Tests Failed: _____
Blockers: _____

Notes:
_______________________________________
_______________________________________
_______________________________________

Issues Found:
1. _______________________________________
2. _______________________________________
3. _______________________________________
```

---

## 🐛 Issue Template

When you find a bug:

```
Title: [Clear, concise description]

Steps to Reproduce:
1.
2.
3.

Expected Behavior:


Actual Behavior:


Environment:
- Device:
- OS:
- App Version:
- Test Account:

Logs/Screenshots:


Severity: Critical / High / Medium / Low
Status: New / In Progress / Resolved
```

---

**Happy Testing! 🎉**

For help, see:
- `BILLING_INTEGRATION_GUIDE.md` - Setup instructions
- `BILLING_USAGE_EXAMPLES.md` - Code examples
- `BILLING_QUICK_START.md` - Quick reference
