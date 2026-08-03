import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileWarning,
  Globe2,
  Loader2,
  Mail,
  ShieldAlert,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { API } from '../api/client.js';
import BrandLogo from './BrandLogo.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDeletionDate(value) {
  if (!value) return 'within 30 days';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'within 30 days';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(parsed);
}

export default function DeleteAccount({ userAuth, onDeletionScheduled }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verificationToken = searchParams.get('token') || '';
  const resultHeadingRef = useRef(null);
  const [email, setEmail] = useState(() => userAuth?.email || '');
  const [requestState, setRequestState] = useState('idle');
  const [error, setError] = useState('');
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Account and data deletion | bitezsnap';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (requestState === 'request-sent' || requestState === 'scheduled') {
      resultHeadingRef.current?.focus();
    }
  }, [requestState]);

  const emailIsValid = EMAIL_PATTERN.test(email.trim());
  const isSubmitting = requestState === 'submitting-request'
    || requestState === 'submitting-confirmation';

  const submitDeletionRequest = async (event) => {
    event.preventDefault();
    if (!emailIsValid || isSubmitting) return;

    setRequestState('submitting-request');
    setError('');

    try {
      const response = await fetch(`${API}/auth/account/deletion-request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'We could not submit your deletion request. Please try again.');
      }
      setRequestState('request-sent');
    } catch (requestError) {
      setError(requestError.message || 'We could not submit your deletion request. Please try again.');
      setRequestState('error');
    }
  };

  const confirmDeletionRequest = async () => {
    if (!verificationToken || isSubmitting) return;

    setRequestState('submitting-confirmation');
    setError('');

    try {
      const response = await fetch(`${API}/auth/account/deletion/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'We could not confirm your deletion request. Please try again.');
      }

      setScheduledDeletionAt(body.scheduledDeletionAt || null);
      setRequestState('scheduled');
      onDeletionScheduled?.();
      navigate('/delete-account', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'We could not confirm your deletion request. Please try again.');
      setRequestState('confirmation-error');
    }
  };

  const goBack = () => navigate(userAuth ? '/profile' : '/login');

  return (
    <div className="account-deletion-page">
      <header className="account-deletion-header">
        <button type="button" className="account-deletion-back" onClick={goBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{userAuth ? 'Back to Profile' : 'Back to Sign in'}</span>
        </button>
        <div className="account-deletion-brand" aria-label="bitezsnap">
          <BrandLogo alt="" aria-hidden="true" />
          <strong>bitezsnap</strong>
        </div>
      </header>

      <main className="account-deletion-body">
        {requestState === 'scheduled' ? (
          <section className="account-deletion-success" aria-live="polite">
            <span className="account-deletion-success-icon" aria-hidden="true">
              <CheckCircle2 size={30} />
            </span>
            <h1 ref={resultHeadingRef} tabIndex="-1">Deletion request confirmed</h1>
            <p>
              Your bitezsnap account is scheduled for permanent deletion on{' '}
              <strong>{formatDeletionDate(scheduledDeletionAt)}</strong>.
            </p>
            <p>
              The request will be processed within 30 days. Signing in during the seven-day grace
              period cancels the request and keeps your account.
            </p>
            <button type="button" className="account-deletion-secondary" onClick={() => navigate('/login')}>
              Return to sign in
            </button>
          </section>
        ) : (
          <>
            <section className="account-deletion-hero">
              <span className="account-deletion-hero-icon" aria-hidden="true">
                <Trash2 size={28} />
              </span>
              <div>
                <p className="account-deletion-eyebrow">Account and data controls</p>
                <h1>Delete your bitezsnap account</h1>
                <p>
                  Submit a request to permanently delete your bitezsnap account and associated
                  personal data. This page is publicly accessible and does not require the app.
                </p>
              </div>
            </section>

            <section className="account-deletion-policy-section" aria-labelledby="deletion-request-heading">
              <div className="account-deletion-section-heading">
                <p>Request options</p>
                <h2 id="deletion-request-heading">How to request account deletion</h2>
                <span>
                  You can initiate deletion from the Android app or submit the registered email
                  address through the secure public form on this page.
                </span>
              </div>

              <div className="account-deletion-methods">
                <article>
                  <Smartphone size={22} aria-hidden="true" />
                  <div>
                    <h3>From the Android app</h3>
                    <ol>
                      <li>Open bitezsnap and sign in.</li>
                      <li>Open <strong>Profile</strong>.</li>
                      <li>Under <strong>Account Actions</strong>, select <strong>Delete Account</strong>.</li>
                      <li>Enter your registered email address and submit the request.</li>
                    </ol>
                  </div>
                </article>

                <article>
                  <Globe2 size={22} aria-hidden="true" />
                  <div>
                    <h3>From this website</h3>
                    <ol>
                      <li>Enter your registered email address in the public form.</li>
                      <li>Select <strong>Request Deletion</strong>.</li>
                      <li>Open the verification link sent to that address within 24 hours.</li>
                      <li>Review and confirm the permanent deletion request.</li>
                    </ol>
                  </div>
                </article>
              </div>
            </section>

            <section className="account-deletion-grid" aria-label="Account deletion timing and data handling">
              <article>
                <Clock3 size={22} aria-hidden="true" />
                <h2>Processing time</h2>
                <p>
                  After email verification, deletion is scheduled with a seven-day grace period
                  and will be processed within 30 days.
                </p>
              </article>
              <article>
                <ShieldAlert size={22} aria-hidden="true" />
                <h2>Data permanently deleted</h2>
                <ul>
                  <li>Account identity and sign-in data</li>
                  <li>Profile, medical conditions, and health goals</li>
                  <li>Scan history, saved results, progress, and authored feature requests</li>
                  <li>Active sessions and links identifying you as a product contributor</li>
                </ul>
              </article>
              <article>
                <Database size={22} aria-hidden="true" />
                <h2>Limited data retention</h2>
                <ul>
                  <li>Anonymised shared product facts may remain without your account link.</li>
                  <li>Records required for security, fraud prevention, tax, or legal compliance may be retained.</li>
                  <li>See the Privacy Policy for current retention details and support options.</li>
                </ul>
              </article>
            </section>

            <aside className="account-deletion-notice">
              <FileWarning size={22} aria-hidden="true" />
              <div>
                <h2>Permanent action</h2>
                <p>
                  Data deletion is permanent once completed and will be processed within 30 days.
                  Read the{' '}
                  <button type="button" onClick={() => navigate('/privacy-policy')}>Privacy Policy</button>{' '}
                  before submitting if you need more information.
                </p>
              </div>
            </aside>

            {verificationToken ? (
              <section id="account-deletion-request" className="account-deletion-form account-deletion-confirm">
                <div className="account-deletion-form-heading">
                  <p>Email verification</p>
                  <h2>Confirm your deletion request</h2>
                </div>
                <p className="account-deletion-form-copy">
                  This link verifies that you can access the registered email address. Select the
                  button below to schedule permanent account and associated data deletion.
                </p>
                <p className="account-deletion-permanent-note">
                  Data deletion is permanent once completed and will be processed within 30 days.
                </p>
                {error && <p className="account-deletion-error" role="alert">{error}</p>}
                <button
                  type="button"
                  className="account-deletion-submit"
                  onClick={confirmDeletionRequest}
                  disabled={isSubmitting}
                >
                  {requestState === 'submitting-confirmation' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      Confirming request...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} aria-hidden="true" />
                      Confirm Deletion Request
                    </>
                  )}
                </button>
              </section>
            ) : requestState === 'request-sent' ? (
              <section id="account-deletion-request" className="account-deletion-request-sent" aria-live="polite">
                <span aria-hidden="true"><Mail size={26} /></span>
                <div>
                  <h2 ref={resultHeadingRef} tabIndex="-1">Check your email</h2>
                  <p>
                    If a bitezsnap account exists for <strong>{email.trim()}</strong>, we sent a
                    verification link. Open it within 24 hours to confirm the request.
                  </p>
                  <p>No deletion is scheduled until the email link is confirmed.</p>
                </div>
                <button
                  type="button"
                  className="account-deletion-secondary"
                  onClick={() => {
                    setRequestState('idle');
                    setError('');
                  }}
                >
                  Submit another email
                </button>
              </section>
            ) : (
              <form
                id="account-deletion-request"
                className="account-deletion-form"
                onSubmit={submitDeletionRequest}
                noValidate
              >
                <div className="account-deletion-form-heading">
                  <p>Public deletion request</p>
                  <h2>Request account and data deletion</h2>
                </div>

                <div className="account-deletion-field">
                  <label htmlFor="account-deletion-email">Registered Email Address</label>
                  <input
                    id="account-deletion-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    aria-describedby="account-deletion-email-help account-deletion-disclaimer"
                    required
                  />
                  <p id="account-deletion-email-help">
                    Use the same email address associated with your bitezsnap account.
                  </p>
                </div>

                <p id="account-deletion-disclaimer" className="account-deletion-permanent-note">
                  Data deletion is permanent once completed and will be processed within 30 days.
                </p>

                {error && <p className="account-deletion-error" role="alert">{error}</p>}

                <button
                  type="submit"
                  className="account-deletion-submit"
                  disabled={!emailIsValid || isSubmitting}
                >
                  {requestState === 'submitting-request' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      Submitting request...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} aria-hidden="true" />
                      <strong>Request Deletion</strong>
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="account-deletion-support">
              Need help with your request? Email{' '}
              <a href="mailto:support@bitezsnap.app?subject=Account%20deletion%20help">support@bitezsnap.app</a>.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
