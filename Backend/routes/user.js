const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireOwnership } = require('../utils/ownershipCheck');

// GET /api/user/scan-quota
router.get('/scan-quota', authenticate, async (req, res) => {
  try {
    const userRes = await req.pool.query(
      'SELECT scans_used, scan_limit, plan, plan_expires_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    const scans_used = user.scans_used ?? 0;
    const currentPlan = user.plan || 'free';
    const FREE_SCAN_LIMIT = 5;
    const scan_limit = currentPlan === 'free' ? FREE_SCAN_LIMIT : (user.scan_limit ?? FREE_SCAN_LIMIT);
    const remaining = Math.max(0, scan_limit - scans_used);
    res.json({
      used: scans_used,
      limit: scan_limit,
      plan: currentPlan,
      remaining,
      planExpiresAt: user.plan_expires_at
    });
  } catch (err) {
    console.error('Error fetching scan quota:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/user/:userId/history
router.get('/:userId/history', authenticate, async (req, res) => {
  try {
    requireOwnership(req.params.userId, req.userId);
    const historyRes = await req.pool.query(
      'SELECT * FROM scans WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(historyRes.rows);
  } catch (err) {
    console.error('Error fetching user history:', err);
    res.status(err.status || 500).json({ error: err.message || 'Database error' });
  }
});

// GET /api/user/:userId/quota
router.get('/:userId/quota', authenticate, async (req, res) => {
  try {
    requireOwnership(req.params.userId, req.userId);
    const userRes = await req.pool.query(
      'SELECT scans_used, scan_limit, plan, plan_expires_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    const scans_used = user.scans_used ?? 0;
    const currentPlan = user.plan || 'free';
    const FREE_SCAN_LIMIT = 5;
    const scan_limit = currentPlan === 'free' ? FREE_SCAN_LIMIT : (user.scan_limit ?? FREE_SCAN_LIMIT);
    const remaining = Math.max(0, scan_limit - scans_used);
    res.json({
      used: scans_used,
      limit: scan_limit,
      plan: currentPlan,
      remaining,
      planExpiresAt: user.plan_expires_at
    });
  } catch (err) {
    console.error('Error fetching user quota:', err);
    res.status(err.status || 500).json({ error: err.message || 'Database error' });
  }
});

module.exports = router;
