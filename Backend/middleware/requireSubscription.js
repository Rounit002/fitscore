/**
 * Middleware to check if user has an active subscription
 * Checks subscription_status and subscription_expiry in user.profile JSONB
 */

function requireSubscription(req, res, next) {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const user = req.user;

  // Check if user has profile data
  if (!user.profile) {
    return res.status(403).json({
      error: 'Subscription required',
      message: 'You need an active subscription to access this feature',
    });
  }

  const subscriptionStatus = user.profile.subscription_status;
  const subscriptionExpiry = user.profile.subscription_expiry;

  // Check if subscription is active
  if (subscriptionStatus !== 'active') {
    return res.status(403).json({
      error: 'Subscription required',
      message: 'Your subscription is not active. Please subscribe to access this feature',
      status: subscriptionStatus || 'none',
    });
  }

  // Check if subscription has expired
  const now = Date.now();
  if (!subscriptionExpiry || subscriptionExpiry < now) {
    return res.status(403).json({
      error: 'Subscription expired',
      message: 'Your subscription has expired. Please renew to continue',
      expiryDate: subscriptionExpiry,
    });
  }

  // Subscription is valid, proceed
  next();
}

module.exports = requireSubscription;
