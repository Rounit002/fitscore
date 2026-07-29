const requirePlan = (allowedPlans) => async (req, res, next) => {
  try {
    const userRes = await req.pool.query(
      'SELECT plan, plan_expires_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let user = userRes.rows[0];

    // Check expiration and auto downgrade if expired
    if (user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) {
      console.log('[Gatekeeper] An expired plan was downgraded to free');
      await req.pool.query(
        "UPDATE users SET plan = 'free', scan_limit = 5, is_premium = false WHERE id = $1",
        [req.userId]
      );
      // Fetch refreshed row
      const refreshedRes = await req.pool.query(
        'SELECT plan, plan_expires_at FROM users WHERE id = $1',
        [req.userId]
      );
      user = refreshedRes.rows[0];
    }

    const currentPlan = user.plan || 'free';

    if (!allowedPlans.includes(currentPlan)) {
      return res.status(403).json({
        error: `Access denied. This feature requires one of the following plans: ${allowedPlans.join(', ')}. Current plan: ${currentPlan}`
      });
    }

    next();
  } catch (err) {
    console.error('Error in requirePlan middleware:', err);
    res.status(500).json({ error: 'Internal server error checking plan permissions' });
  }
};

module.exports = requirePlan;
