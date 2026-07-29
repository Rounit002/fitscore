import { useState } from 'react';
import { Eye, EyeOff, Sparkles, CheckCircle, Flame } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import { PASSWORD_REQUIREMENTS, validatePassword } from '../utils/passwordPolicy.js';

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

export default function SignUp({ onNavigateLogin, onSignUpPending, onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      onSignUpPending({ type: 'local', name: form.name, email: form.email, password: form.password });
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
          Fit<em>Scan</em>
        </div>

        <div>
          <h2 className="auth-brand-title">Start eating cleaner today.</h2>

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
          &copy; {new Date().getFullYear()} FitScan Inc. All rights reserved.
        </div>
      </aside>

      {/* Form panel */}
      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-mark">
            <em>Fit</em>Scan
          </div>

          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join us to start tracking and scanning cleaner</p>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="signup-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">Full Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={update('name')}
                required
                id="signup-name"
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Email Address</label>
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update('email')}
                required
                id="signup-email"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Password</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input has-reveal"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={12}
                  maxLength={128}
                  id="signup-password"
                  autoComplete="new-password"
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
              <small className="auth-help">{PASSWORD_REQUIREMENTS}</small>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-confirm-password">Confirm Password</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input has-reveal"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  required
                  minLength={12}
                  maxLength={128}
                  id="signup-confirm-password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-reveal"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit edge-highlight"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              id="signup-submit"
            >
              {isSubmitting ? <><span className="btn-spinner" /> Creating account...</> : 'Sign Up'}
            </button>
          </form>

          {/* Google accounts already have a verified email, so they skip the
              email/password form and go straight to the app (or onboarding for
              a brand-new account, handled by the login callback). */}
          <GoogleSignInButton onLogin={onLogin} onError={setError} label="Continue with Google" />

          <p className="auth-alt">
            Already have an account?
            <button
              className="auth-text-link"
              onClick={onNavigateLogin}
              id="navigate-login"
            >
              Sign in
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
