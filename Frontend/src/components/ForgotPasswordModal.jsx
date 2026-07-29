import { useState } from 'react';
import { X, Mail, CheckCircle2 } from 'lucide-react';
import { API } from '../api/client.js';

/**
 * "Forgot password" request dialog.
 *
 * Posts the email to POST /auth/forgot-password, which always answers with the
 * same generic success message whether or not the address exists — so the UI
 * shows a confirmation regardless, never revealing which emails are registered.
 */
export default function ForgotPasswordModal({ onClose, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('sending');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send the reset email.');
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  return (
    <div
      className="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Reset your password"
      onClick={onClose}
    >
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {status === 'sent' ? (
          <div className="auth-modal-body auth-modal-success">
            <span className="auth-modal-icon" aria-hidden="true">
              <CheckCircle2 size={28} />
            </span>
            <h2 className="auth-modal-title">Check your inbox</h2>
            <p className="auth-modal-subtitle">
              If an account exists for <strong>{email}</strong>, a password reset link is on its
              way. The link expires in 30 minutes.
            </p>
            <button type="button" className="auth-submit edge-highlight" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="auth-modal-body" onSubmit={handleSubmit}>
            <span className="auth-modal-icon" aria-hidden="true">
              <Mail size={28} />
            </span>
            <h2 className="auth-modal-title">Reset your password</h2>
            <p className="auth-modal-subtitle">
              Enter the email tied to your account and we'll send you a link to choose a new
              password.
            </p>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="forgot-email">Email Address</label>
              <input
                className="auth-input"
                type="email"
                id="forgot-email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="auth-submit edge-highlight"
              disabled={status === 'sending'}
              aria-busy={status === 'sending'}
            >
              {status === 'sending' ? <><span className="btn-spinner" /> Sending…</> : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
