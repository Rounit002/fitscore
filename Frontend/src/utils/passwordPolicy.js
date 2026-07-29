export const PASSWORD_REQUIREMENTS = 'Use 12-128 characters with uppercase, lowercase, number, and symbol.';

export function validatePassword(password) {
  if (password.length < 12 || password.length > 128) return PASSWORD_REQUIREMENTS;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return PASSWORD_REQUIREMENTS;
  if (!/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) return PASSWORD_REQUIREMENTS;
  return null;
}
