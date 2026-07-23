const { requireOwnership } = require('./ownershipCheck');

describe('requireOwnership', () => {
  it('does not throw when IDs match (numbers)', () => {
    expect(() => requireOwnership(1, 1)).not.toThrow();
  });

  it('does not throw when IDs match (string vs number)', () => {
    expect(() => requireOwnership('5', 5)).not.toThrow();
  });

  it('throws 403 when IDs differ', () => {
    expect(() => requireOwnership(1, 2)).toThrow('Access denied');
    try { requireOwnership(1, 2); } catch (e) { expect(e.status).toBe(403); }
  });

  it('throws when resourceUserId is null', () => {
    expect(() => requireOwnership(null, 1)).toThrow();
  });

  it('throws when requestingUserId is undefined', () => {
    expect(() => requireOwnership(1, undefined)).toThrow();
  });
});
