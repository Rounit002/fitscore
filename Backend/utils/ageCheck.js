/**
 * Minimum age policy.
 *
 * FitScan is a 13+ product, so a date of birth that puts the user under 13 is
 * rejected. Shared between the registration/profile validators and the
 * frontend's mirror of the same rule so both cannot drift.
 */

const MINIMUM_AGE = 13;
const MAXIMUM_AGE = 120;

/** Parses YYYY-MM-DD into a UTC date, returning null when malformed. */
function parseDateOfBirth(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Rejects impossible calendar dates like 2020-02-31, which Date would roll over.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Whole years elapsed since `dateOfBirth`, or null when unparseable. */
function calculateAge(dateOfBirth, now = new Date()) {
  const birth = parseDateOfBirth(dateOfBirth);
  if (!birth) return null;

  const reference = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (birth.getTime() > reference) return null; // future date of birth

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return age;
}

/** True when the date of birth is valid and the user is at least MINIMUM_AGE. */
function isOldEnough(dateOfBirth, now = new Date()) {
  const age = calculateAge(dateOfBirth, now);
  return age !== null && age >= MINIMUM_AGE && age <= MAXIMUM_AGE;
}

/** The latest date of birth that still satisfies the minimum age, as YYYY-MM-DD. */
function maxAllowedDateOfBirth(now = new Date()) {
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear() - MINIMUM_AGE, now.getUTCMonth(), now.getUTCDate())
  );
  return cutoff.toISOString().split('T')[0];
}

module.exports = {
  MINIMUM_AGE,
  MAXIMUM_AGE,
  parseDateOfBirth,
  calculateAge,
  isOldEnough,
  maxAllowedDateOfBirth,
};
