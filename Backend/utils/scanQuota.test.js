const { FREE_SCAN_LIMIT, resolveScanLimit, buildQuota, buildQuotaFields } = require('./scanQuota');

describe('scanQuota', () => {
  describe('resolveScanLimit', () => {
    it('caps free plans at the free limit regardless of stored scan_limit', () => {
      expect(resolveScanLimit({ plan: 'free', scan_limit: 999 })).toBe(FREE_SCAN_LIMIT);
    });

    it('defaults a missing plan to free', () => {
      expect(resolveScanLimit({})).toBe(FREE_SCAN_LIMIT);
    });

    it('honours a paid plan scan_limit', () => {
      expect(resolveScanLimit({ plan: 'pro', scan_limit: 200 })).toBe(200);
    });

    it('falls back to the free limit when a paid plan has no valid limit', () => {
      expect(resolveScanLimit({ plan: 'pro', scan_limit: 0 })).toBe(FREE_SCAN_LIMIT);
    });
  });

  describe('buildQuota', () => {
    it('reports used/limit/remaining for a free user', () => {
      expect(buildQuota({ plan: 'free', scans_used: 2 })).toEqual({
        used: 2,
        limit: FREE_SCAN_LIMIT,
        plan: 'free',
        remaining: FREE_SCAN_LIMIT - 2,
        isPremium: false,
        planExpiresAt: null,
      });
    });

    it('never reports negative remaining', () => {
      expect(buildQuota({ plan: 'free', scans_used: 99 }).remaining).toBe(0);
    });

    it('marks paid plans as premium', () => {
      expect(buildQuota({ plan: 'pro', scan_limit: 100, scans_used: 10 }).isPremium).toBe(true);
    });
  });

  describe('buildQuotaFields', () => {
    it('exposes camelCase fields for the auth payload', () => {
      expect(buildQuotaFields({ plan: 'free', scans_used: 1 })).toEqual({
        plan: 'free',
        scansUsed: 1,
        scanLimit: FREE_SCAN_LIMIT,
        scansRemaining: FREE_SCAN_LIMIT - 1,
      });
    });
  });
});
