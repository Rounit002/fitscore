/**
 * Subscription plan catalogue — the single source of truth for what a plan costs
 * and how long it lasts.
 *
 * Prices live on the server, never in the request. The client sends only a
 * `planId`; the amount charged and the entitlement granted are both looked up
 * here. If the client could send an amount, a user could buy the lifetime plan
 * for 1 paisa.
 *
 * `amount` is in paise (Razorpay's smallest currency unit): 499 INR = 49900.
 * `durationDays: null` means the entitlement never expires (lifetime), which the
 * expiry checks in middleware/requirePlan.js and routes/analyze.js already treat
 * correctly because both guard on `plan_expires_at &&  ...`.
 */

// Premium is advertised as "unlimited, subject to fair usage". The quota column
// is NOT NULL-able in practice and resolveScanLimit() needs a number, so this
// stands in for unlimited while still capping runaway automated use.
const PREMIUM_SCAN_LIMIT = 100000;

const PLANS = {
  trial7: {
    id: 'trial7',
    label: '7 Days',
    amount: 5000, // 50 INR
    durationDays: 7,
    // Intro pricing: only honoured if the account has never completed a payment.
    firstPurchaseOnly: true,
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    amount: 49900, // 499 INR
    durationDays: 30,
    firstPurchaseOnly: false,
  },
  yearly: {
    id: 'yearly',
    label: 'Yearly',
    // Advertised as 400/month billed yearly, so the charge is 400 x 12.
    amount: 480000, // 4800 INR
    durationDays: 365,
    firstPurchaseOnly: false,
  },
  lifetime: {
    id: 'lifetime',
    label: 'Lifetime',
    amount: 1500000, // 15000 INR
    durationDays: null, // never expires
    firstPurchaseOnly: false,
  },
};

const PLAN_IDS = Object.keys(PLANS);

function getPlan(planId) {
  return Object.prototype.hasOwnProperty.call(PLANS, planId) ? PLANS[planId] : null;
}

module.exports = { PLANS, PLAN_IDS, getPlan, PREMIUM_SCAN_LIMIT };
