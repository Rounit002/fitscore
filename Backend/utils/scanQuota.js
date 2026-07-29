/**
 * Scan quota policy.
 *
 * The free allowance was previously written out separately in routes/analyze.js,
 * routes/user.js and (as a stale hardcoded 20) in the frontend shell, so the
 * number a user saw did not match the number that was actually enforced.
 * Everything now derives from here.
 */

const FREE_SCAN_LIMIT = 5;

/** Effective limit for a user row: free plans are capped regardless of scan_limit. */
function resolveScanLimit(userRow = {}) {
  const plan = userRow.plan || 'free';
  if (plan === 'free') return FREE_SCAN_LIMIT;
  const stored = Number(userRow.scan_limit);
  return Number.isFinite(stored) && stored > 0 ? stored : FREE_SCAN_LIMIT;
}

/** Canonical quota shape returned by /api/user/scan-quota. */
function buildQuota(userRow = {}) {
  const used = Number(userRow.scans_used) || 0;
  const limit = resolveScanLimit(userRow);
  const plan = userRow.plan || 'free';

  return {
    used,
    limit,
    plan,
    remaining: Math.max(0, limit - used),
    isPremium: Boolean(userRow.is_premium) || plan !== 'free',
    planExpiresAt: userRow.plan_expires_at ?? null,
  };
}

/**
 * camelCase quota fields merged into the `user` object of auth responses, so the
 * app shell can render the counter straight from the session payload without a
 * second request.
 */
function buildQuotaFields(userRow = {}) {
  const quota = buildQuota(userRow);
  return {
    plan: quota.plan,
    scansUsed: quota.used,
    scanLimit: quota.limit,
    scansRemaining: quota.remaining,
  };
}

module.exports = {
  FREE_SCAN_LIMIT,
  resolveScanLimit,
  buildQuota,
  buildQuotaFields,
};
