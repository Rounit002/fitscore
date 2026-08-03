const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const authenticate = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { payments: paymentSchemas } = require('../validation/schemas');
const { PLANS, getPlan, PREMIUM_SCAN_LIMIT } = require('../config/plans');
const { requirePlayIntegrity } = require('./playIntegrity');

const router = express.Router();

/**
 * GET /api/payment/plans — the catalogue the paywall renders.
 *
 * Served from the same config the charge is derived from, so the price on screen
 * and the price charged cannot drift. Public shape only: no keys, no secrets.
 */
router.get('/plans', authenticate, async (req, res) => {
  try {
    // Intro pricing is per-account, so whether the 7-day tier is offered depends
    // on this user's payment history rather than being a static catalogue fact.
    const paidRes = await req.pool.query(
      "SELECT 1 FROM payment_orders WHERE user_id = $1 AND status = 'paid' LIMIT 1",
      [req.userId],
    );
    const hasPaidBefore = paidRes.rows.length > 0;

    const plans = Object.values(PLANS)
      .filter((plan) => !plan.firstPurchaseOnly || !hasPaidBefore)
      .map((plan) => ({
        id: plan.id,
        label: plan.label,
        amount: plan.amount,
        currency: 'INR',
        durationDays: plan.durationDays,
      }));

    return res.json({ plans, currency: 'INR' });
  } catch (error) {
    console.error('Error listing plans:', error.message);
    return res.status(500).json({ error: 'Failed to load plans' });
  }
});

router.post('/create-order', authenticate, validateRequest({ body: paymentSchemas.createOrder }), async (req, res) => {
  try {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay keys not configured on server' });
    }

    // The schema guarantees planId is a known id, so this cannot be null — but
    // the guard keeps the route honest if the catalogue and schema ever diverge.
    const plan = getPlan(req.body.planId);
    if (!plan) return res.status(400).json({ error: 'Unknown plan' });

    // Enforce the "first purchase only" rule server-side. The paywall already
    // hides the tier, but hiding a button is not enforcement.
    if (plan.firstPurchaseOnly) {
      const paidRes = await req.pool.query(
        "SELECT 1 FROM payment_orders WHERE user_id = $1 AND status = 'paid' LIMIT 1",
        [req.userId],
      );
      if (paidRes.rows.length > 0) {
        return res.status(409).json({ error: 'This introductory plan is only available on a first purchase' });
      }
    }

    const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({
      // Price comes from the server catalogue, never from the request body.
      amount: plan.amount,
      currency: 'INR',
      receipt: `receipt_user_${req.userId}_${Date.now()}`,
      notes: { planId: plan.id },
    });

    // The plan is persisted with the order so /verify grants the entitlement that
    // was actually paid for. Reading it back from the request at verify time
    // would let a client pay for 7 days and claim lifetime.
    await req.pool.query(
      `INSERT INTO payment_orders (order_id, user_id, amount, currency, plan_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [order.id, req.userId, order.amount, order.currency, plan.id],
    );

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan_id: plan.id,
      // A Razorpay key id is a publishable client identifier, not a secret.
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error.message);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post(
  '/verify',
  authenticate,
  requirePlayIntegrity('razorpay_verify'),
  validateRequest({ body: paymentSchemas.razorpayVerify }),
  async (req, res) => {
  let client;
  let ownsClient = false;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay keys not configured on server' });
    }

    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const suppliedBuffer = Buffer.from(razorpay_signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    client = typeof req.pool.connect === 'function' ? await req.pool.connect() : req.pool;
    ownsClient = client !== req.pool;
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT user_id, status, plan_id FROM payment_orders WHERE order_id = $1 FOR UPDATE',
      [razorpay_order_id],
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment order not found' });
    }
    if (Number(orderResult.rows[0].user_id) !== Number(req.userId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Payment order does not belong to this account' });
    }
    if (orderResult.rows[0].status === 'paid') {
      await client.query('COMMIT');
      return res.json({ success: true, duplicate: true });
    }

    // Duration comes from the plan recorded on the order, not a hardcoded 30.
    // Unknown/legacy orders fall back to the old monthly behaviour so rows
    // created before plan_id existed still verify correctly.
    const paidPlan = getPlan(orderResult.rows[0].plan_id) || PLANS.monthly;

    // durationDays === null is the lifetime plan: expiry stays NULL, which the
    // downgrade checks in requirePlan.js / analyze.js read as "never expires"
    // because both are guarded on `plan_expires_at && <past>`.
    //
    // Both column pairs are written on purpose. `subscription_plan` /
    // `subscription_expires_at` back the Profile screen, while `plan`,
    // `plan_expires_at` and `scan_limit` are what the scan quota and the
    // requirePlan gate actually read. The previous version set only the first
    // pair, so a paid user still hit the 5-scan free cap.
    await client.query(
      `UPDATE users
       SET is_premium = true,
           subscription_plan = $1,
           subscription_expires_at = CASE
             WHEN $2::int IS NULL THEN NULL
             ELSE CURRENT_TIMESTAMP + ($2::int * INTERVAL '1 day')
           END,
           plan = 'premium',
           plan_expires_at = CASE
             WHEN $2::int IS NULL THEN NULL
             ELSE CURRENT_TIMESTAMP + ($2::int * INTERVAL '1 day')
           END,
           scan_limit = $3,
           image_scans_used = 0,
           scans_used = 0
       WHERE id = $4`,
      [paidPlan.id, paidPlan.durationDays, PREMIUM_SCAN_LIMIT, req.userId],
    );
    await client.query(
      `UPDATE payment_orders
       SET status = 'paid', payment_id = $1, verified_at = NOW()
       WHERE order_id = $2`,
      [razorpay_payment_id, razorpay_order_id],
    );
    await client.query('COMMIT');
    return res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error verifying payment:', error.message);
    return res.status(500).json({ error: 'Failed to verify payment' });
  } finally {
    if (ownsClient) client.release();
  }
  },
);

module.exports = router;
