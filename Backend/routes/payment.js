const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const authenticate = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { emptyBody, payments: paymentSchemas } = require('../validation/schemas');

const router = express.Router();

router.post('/create-order', authenticate, validateRequest({ body: emptyBody }), async (req, res) => {
  try {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay keys not configured on server' });
    }

    const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({
      amount: 24900,
      currency: 'INR',
      receipt: `receipt_user_${req.userId}_${Date.now()}`,
      notes: { planType: 'premium' },
    });

    await req.pool.query(
      `INSERT INTO payment_orders (order_id, user_id, amount, currency)
       VALUES ($1, $2, $3, $4)`,
      [order.id, req.userId, order.amount, order.currency],
    );

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      // A Razorpay key id is a publishable client identifier, not a secret.
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error.message);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/verify', authenticate, validateRequest({ body: paymentSchemas.razorpayVerify }), async (req, res) => {
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
      'SELECT user_id, status FROM payment_orders WHERE order_id = $1 FOR UPDATE',
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

    await client.query(
      `UPDATE users
       SET is_premium = true,
           subscription_plan = $1,
           subscription_expires_at = CURRENT_TIMESTAMP + ($2::int * INTERVAL '1 day'),
           image_scans_used = 0
       WHERE id = $3`,
      ['premium', 30, req.userId],
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
});

module.exports = router;
