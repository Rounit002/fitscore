import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { API } from '../api/client.js';
import { PASSWORD_REQUIREMENTS, validatePassword } from '../utils/passwordPolicy.js';
import BrandLogo from './BrandLogo.jsx';

/**
 * Landing page for the emailed reset link (/reset-password?token=...&email=...).
 *
 * Posts the token plus the new password to POST /auth/reset-password. The token
 * is single-use and time-limited server-side; this page only collects and
 * forwards it.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This reset link is missing its token. Please use the link from your email.');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset your password.');
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  return (
    <div className="auth-page page-transition">
      <main className="auth-form-panel" style={{ margin: '0 auto' }}>
        <div className="auth-form-inner">
          <div className="auth-form-mark">
            <BrandLogo className="auth-form-logo" alt="" aria-hidden="true" />
            <span><em>bitez</em>snap</span>
          </div>

          {status === 'done' ? (
            <div className="auth-modal-success" style={{ textAlign: 'center' }}>
              <span className="auth-modal-icon" aria-hidden="true">
                <CheckCircle2 size={28} />
              </span>
              <h1 className="auth-title">Password updated</h1>
              <p className="auth-subtitle">
                Your password has been changed. You can now log in with your new password.
              </p>
              <button
                type="button"
                className="auth-submit edge-highlight"
                onClick={() => navigate('/login', { replace: true })}
              >
                Go to login
              </button>
            </div>
          ) : (
            <>
              <span className="auth-modal-icon" aria-hidden="true">
                <ShieldCheck size={28} />
              </span>
              <h1 className="auth-title">Choose a new password</h1>
              <p className="auth-subtitle">
                {email ? <>Resetting the password for <strong>{email}</strong>.</> : 'Enter a new password for your account.'}
              </p>

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reset-password">New Password</label>
                  <div className="auth-input-wrap">
                    <input
                      className="auth-input has-reveal"
                      type={showPassword ? 'text' : 'password'}
                      id="reset-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="auth-reveal"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <small className="auth-help">{PASSWORD_REQUIREMENTS}</small>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="reset-confirm">Confirm Password</label>
                  <input
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    id="reset-confirm"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit edge-highlight"
                  disabled={status === 'submitting'}
                  aria-busy={status === 'submitting'}
                >
                  {status === 'submitting' ? <><span className="btn-spinner" /> Updating…</> : 'Update password'}
                </button>
              </form>

              <p className="auth-alt">
                <button className="auth-text-link" onClick={() => navigate('/login')}>
                  Back to login
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
