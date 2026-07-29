const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireOwnership } = require('../utils/ownershipCheck');
const { buildQuota } = require('../utils/scanQuota');
const { validateRequest } = require('../middleware/validateRequest');
const { userIdParams } = require('../validation/schemas');

const QUOTA_COLUMNS = 'scans_used, scan_limit, plan, plan_expires_at, is_premium';

// GET /api/user/scan-quota
router.get('/scan-quota', authenticate, async (req, res) => {
  try {
    const userRes = await req.pool.query(
      `SELECT ${QUOTA_COLUMNS} FROM users WHERE id = $1`,
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(buildQuota(userRes.rows[0]));
  } catch (err) {
    console.error('Error fetching scan quota:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/user/:userId/history
router.get('/:userId/history', authenticate, validateRequest({ params: userIdParams }), async (req, res) => {
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
router.get('/:userId/quota', authenticate, validateRequest({ params: userIdParams }), async (req, res) => {
  try {
    requireOwnership(req.params.userId, req.userId);
    const userRes = await req.pool.query(
      `SELECT ${QUOTA_COLUMNS} FROM users WHERE id = $1`,
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(buildQuota(userRes.rows[0]));
  } catch (err) {
    console.error('Error fetching user quota:', err);
    res.status(err.status || 500).json({ error: err.message || 'Database error' });
  }
});

module.exports = router;
