const { calculateAge, isOldEnough, maxAllowedDateOfBirth, MINIMUM_AGE } = require('./ageCheck');

describe('ageCheck', () => {
  const fixedNow = new Date('2026-07-28T00:00:00Z');

  describe('calculateAge', () => {
    it('computes whole years elapsed', () => {
      expect(calculateAge('2000-07-28', fixedNow)).toBe(26);
    });

    it('does not count a birthday that has not happened yet this year', () => {
      expect(calculateAge('2000-12-31', fixedNow)).toBe(25);
    });

    it('returns null for malformed input', () => {
      expect(calculateAge('not-a-date', fixedNow)).toBeNull();
      expect(calculateAge('', fixedNow)).toBeNull();
      expect(calculateAge(undefined, fixedNow)).toBeNull();
    });

    it('returns null for impossible calendar dates', () => {
      expect(calculateAge('2020-02-31', fixedNow)).toBeNull();
    });

    it('returns null for a future date of birth', () => {
      expect(calculateAge('2030-01-01', fixedNow)).toBeNull();
    });
  });

  describe('isOldEnough', () => {
    it('accepts a user exactly at the minimum age', () => {
      expect(isOldEnough(`${2026 - MINIMUM_AGE}-07-28`, fixedNow)).toBe(true);
    });

    it('rejects a user one day short of the minimum age', () => {
      expect(isOldEnough(`${2026 - MINIMUM_AGE}-07-29`, fixedNow)).toBe(false);
    });

    it('rejects a clearly under-age user', () => {
      expect(isOldEnough('2020-01-01', fixedNow)).toBe(false);
    });

    it('rejects malformed dates', () => {
      expect(isOldEnough('garbage', fixedNow)).toBe(false);
    });
  });

  describe('maxAllowedDateOfBirth', () => {
    it('returns the date exactly MINIMUM_AGE years ago', () => {
      expect(maxAllowedDateOfBirth(fixedNow)).toBe('2013-07-28');
    });
  });
});
