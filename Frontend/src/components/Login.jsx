import { useState } from 'react';
import { Eye, EyeOff, Sparkles, CheckCircle, Flame } from 'lucide-react';
import { API } from '../api/client.js';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import ForgotPasswordModal from './ForgotPasswordModal.jsx';
import { routeHref } from '../utils/platformUtils.js';
import BrandLogo from './BrandLogo.jsx';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Label Analysis',
    copy: 'Instantly decode ingredients and uncover harmful additives or hidden sugars.',
  },
  {
    icon: CheckCircle,
    title: 'Healthier Alternatives',
    copy: 'Get tailored smart suggestions for better choices matching your lifestyle.',
  },
  {
    icon: Flame,
    title: 'Streak & Habits',
    copy: 'Log your choices, maintain your streak, and earn badges along your wellness journey.',
  },
];

export default function Login({ onLogin, onNavigateSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(
        `${API}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // data.token is only present for the mobile build (X-Client: mobile);
      // on the web the JWT stays in the HttpOnly cookie and this is undefined.
      onLogin(data.user, data.token ?? null, data.deletionCancelled, data.refreshToken ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page page-transition">
      {/* Brand panel - desktop only. Full-bleed decorative surface, so no edge
          treatment (DESIGN_TOKENS.md 2.4 rule 4). */}
      <aside className="auth-brand-panel">
        <div className="auth-brand-mark">
          <BrandLogo className="auth-brand-logo" alt="" aria-hidden="true" />
          <span>bitez<em>snap</em></span>
        </div>

        <div>
          <h2 className="auth-brand-title">Know exactly what you eat.</h2>

          {FEATURES.map(({ icon: Icon, title, copy }) => (
            <div className="auth-feature" key={title}>
              <div className="auth-feature-figure">
                <Icon size={20} />
              </div>
              <div>
                <div className="auth-feature-title">{title}</div>
                <div className="auth-feature-copy">{copy}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-brand-footer">
          &copy; {new Date().getFullYear()} bitezsnap Inc. All rights reserved.
        </div>
      </aside>

      {/* Form panel */}
      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-mark">
            <BrandLogo className="auth-form-logo" alt="" aria-hidden="true" />
            <span><em>bitez</em>snap</span>
          </div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in to your account to continue</p>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="login-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email Address</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="login-email"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input has-reveal"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="login-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-reveal"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-link-row">
              <button
                type="button"
                className="auth-text-link"
                onClick={() => setShowForgot(true)}
              >
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit edge-highlight"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              id="login-submit"
            >
              {isSubmitting ? <><span className="btn-spinner" /> Logging in...</> : 'Log In'}
            </button>
          </form>

          <GoogleSignInButton onLogin={onLogin} onError={setError} label="Continue with Google" />

          <p className="auth-alt">
            Don't have an account?
            <button
              className="auth-text-link"
              onClick={onNavigateSignup}
              id="navigate-signup"
            >
              Sign up for free
            </button>
          </p>

          <p className="auth-legal">
            <a href={routeHref('/privacy-policy')}>Privacy Policy</a>
          </p>
        </div>
      </main>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
