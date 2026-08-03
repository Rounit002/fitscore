/**
 * Transactional email sender.
 *
 * Uses Brevo's HTTP API over fetch so no SMTP dependency is needed. When
 * BREVO_API_KEY is not configured (local development, CI) the message is logged
 * instead of sent and the call still resolves, so the password-reset flow can be
 * exercised end-to-end without a mail provider.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const getSender = () => ({
  email: process.env.MAIL_FROM_ADDRESS || 'no-reply@bitezsnap.app',
  name: process.env.MAIL_FROM_NAME || 'bitezsnap',
});

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} message
 * @returns {Promise<{ sent: boolean, skipped?: boolean }>}
 */
async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn('[Mailer] BREVO_API_KEY is not set — email not sent.');
    // Do not log the recipient or message body: password-reset bodies contain
    // a live bearer credential and recipients are personal data.
    return { sent: false, skipped: true };
  }

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: getSender(),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Email provider rejected the request (${response.status}): ${detail.slice(0, 200)}`);
  }

  return { sent: true };
}

/**
 * Password reset email. The link is single-use and short-lived; the token itself
 * is never stored in plaintext (only its hash lives in the database).
 */
async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const subject = 'Reset your bitezsnap password';

  const text = [
    greeting,
    '',
    'We received a request to reset your bitezsnap password.',
    `Open this link to choose a new one (valid for ${expiresInMinutes} minutes):`,
    resetUrl,
    '',
    'If you did not request this, you can safely ignore this email — your password will not change.',
    '',
    'bitezsnap',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
      <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
      <p style="margin:0 0 12px;line-height:1.6">${greeting}</p>
      <p style="margin:0 0 20px;line-height:1.6">
        We received a request to reset your bitezsnap password. Choose a new one using the button below.
        This link is valid for ${expiresInMinutes} minutes and can only be used once.
      </p>
      <p style="margin:0 0 24px">
        <a href="${resetUrl}"
           style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">
          Reset password
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">
        If the button does not work, paste this address into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
        Did not request this? Ignore this email and your password stays unchanged.
      </p>
    </div>
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * Account-deletion verification email. A deletion request is destructive, so
 * the public form never schedules it based on an email address alone. The
 * recipient must open this short-lived link and explicitly confirm the action.
 */
async function sendAccountDeletionVerificationEmail({ to, verificationUrl, expiresInHours }) {
  const subject = 'Confirm your bitezsnap account deletion request';
  const text = [
    'We received a request to delete the bitezsnap account registered to this email address.',
    '',
    `Open this link within ${expiresInHours} hours to verify the request:`,
    verificationUrl,
    '',
    'After verification, the account enters a seven-day grace period. Account and associated data deletion is permanent once completed and will be processed within 30 days.',
    '',
    'If you did not request this, ignore this email. No deletion will be scheduled.',
    '',
    'bitezsnap',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
      <h1 style="font-size:20px;margin:0 0 16px">Confirm account deletion</h1>
      <p style="margin:0 0 16px;line-height:1.6">
        We received a request to delete the bitezsnap account registered to this email address.
      </p>
      <p style="margin:0 0 24px">
        <a href="${verificationUrl}"
           style="display:inline-block;background:#b42318;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">
          Review and confirm deletion
        </a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#4b5563;line-height:1.6">
        This verification link expires in ${expiresInHours} hours. After verification, the account enters a seven-day grace period.
        Account and associated data deletion is permanent once completed and will be processed within 30 days.
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">
        If the button does not work, paste this address into your browser:
      </p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
        Did not request this? Ignore this email. No deletion will be scheduled.
      </p>
    </div>
  `;

  return sendMail({ to, subject, html, text });
}

module.exports = { sendMail, sendPasswordResetEmail, sendAccountDeletionVerificationEmail };
