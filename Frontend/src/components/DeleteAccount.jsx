import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileWarning,
  Loader2,
  LogIn,
  Globe2,
  ShieldAlert,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { API } from '../api/client.js';
import BrandLogo from './BrandLogo.jsx';

const CONFIRMATION_TEXT = 'DELETE';

function formatDeletionDate(value) {
  if (!value) return 'seven days from your request';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'seven days from your request';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(parsed);
}

export default function DeleteAccount({ userAuth, onDeletionScheduled }) {
  const navigate = useNavigate();
  const successHeadingRef = useRef(null);
  const [confirmation, setConfirmation] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [requestState, setRequestState] = useState('idle');
  const [error, setError] = useState('');
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Delete account | bitezsnap';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (requestState === 'success') successHeadingRef.current?.focus();
  }, [requestState]);

  const canSubmit = understood
    && confirmation.trim() === CONFIRMATION_TEXT
    && requestState !== 'submitting';

  const handleDeletionRequest = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setRequestState('submitting');
    setError('');

    try {
      const response = await fetch(`${API}/auth/account/deletion`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Sign in again before submitting the request.');
        }
        throw new Error(body.error || 'We could not schedule your account deletion. Please try again.');
      }

      setScheduledDeletionAt(body.scheduledDeletionAt || null);
      setRequestState('success');
      onDeletionScheduled?.();
    } catch (requestError) {
      setError(requestError.message || 'We could not schedule your account deletion. Please try again.');
      setRequestState('error');
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
        {requestState === 'success' ? (
          <section className="account-deletion-success" aria-live="polite">
            <span className="account-deletion-success-icon" aria-hidden="true">
              <CheckCircle2 size={30} />
            </span>
            <h1 ref={successHeadingRef} tabIndex="-1">Deletion scheduled</h1>
            <p>
              Your bitezsnap account is scheduled for permanent deletion on{' '}
              <strong>{formatDeletionDate(scheduledDeletionAt)}</strong>.
            </p>
            <p>
              All active sessions have been signed out. Signing in before that deadline automatically
              cancels the request and keeps your account.
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
                  This public page explains how to permanently delete your bitezsnap account and
                  associated data. You can submit the request in the Android app or on this website.
                </p>
              </div>
            </section>

            <section className="account-deletion-policy-section" aria-labelledby="deletion-request-heading">
              <div className="account-deletion-section-heading">
                <p>Request options</p>
                <h2 id="deletion-request-heading">How to request account deletion</h2>
                <span>
                  You do not need to contact support if you can sign in. Both options schedule the
                  same permanent account and data deletion.
                </span>
              </div>

              <div className="account-deletion-methods">
                <article>
                  <Smartphone size={22} aria-hidden="true" />
                  <div>
                    <h3>Delete from the Android app</h3>
                    <ol>
                      <li>Open bitezsnap and sign in.</li>
                      <li>Open <strong>Profile</strong>.</li>
                      <li>Under <strong>Account Actions</strong>, select <strong>Delete Account</strong>.</li>
                      <li>Review the information, tick the acknowledgement, and type <strong>DELETE</strong>.</li>
                      <li>Select <strong>Schedule account deletion</strong>.</li>
                    </ol>
                  </div>
                </article>

                <article>
                  <Globe2 size={22} aria-hidden="true" />
                  <div>
                    <h3>Delete on this website</h3>
                    <ol>
                      <li>Use the sign-in button or request form on this page.</li>
                      <li>Sign in to verify the account you want deleted.</li>
                      <li>Tick the acknowledgement and type <strong>DELETE</strong>.</li>
                      <li>Select <strong>Schedule account deletion</strong>.</li>
                    </ol>
                  </div>
                </article>
              </div>
            </section>

            <section className="account-deletion-grid" aria-label="Account deletion timing and data handling">
              <article>
                <Clock3 size={22} aria-hidden="true" />
                <h2>When deletion happens</h2>
                <p>
                  The request is scheduled immediately. Your account is permanently deleted after a
                  seven-day grace period. Signing in during those seven days cancels the request.
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
                <h2>Data retained and for how long</h2>
                <ul>
                  <li>Anonymised shared product facts may remain indefinitely without your account link.</li>
                  <li>Hosted scan-image copies and votes on other users' requests may remain until you ask support to remove them.</li>
                  <li>Payment, security, tax, or legal records may remain only for the period required by law or the relevant provider.</li>
                </ul>
              </article>
            </section>

            <aside className="account-deletion-notice">
              <FileWarning size={22} aria-hidden="true" />
              <div>
                <h2>Before you continue</h2>
                <p>
                  Deletion cannot be undone after the seven-day window. To request removal of a hosted image,
                  a remaining vote record, or to get help when you cannot sign in, email support below. Read the{' '}
                  <button type="button" onClick={() => navigate('/privacy-policy')}>Privacy Policy</button>{' '}
                  for complete data-handling details.
                </p>
              </div>
            </aside>

            {userAuth ? (
              <form id="account-deletion-request" className="account-deletion-form" onSubmit={handleDeletionRequest} noValidate>
                <div className="account-deletion-form-heading">
                  <p>Web deletion request</p>
                  <h2>Confirm account deletion</h2>
                </div>
                <div className="account-deletion-signed-in">
                  <span>Signed in account</span>
                  <strong>{userAuth.email || userAuth.name || 'Current bitezsnap account'}</strong>
                </div>

                <label className="account-deletion-check" htmlFor="account-deletion-understood">
                  <input
                    id="account-deletion-understood"
                    type="checkbox"
                    checked={understood}
                    onChange={(event) => setUnderstood(event.target.checked)}
                  />
                  <span>I understand that my account will be permanently deleted after seven days.</span>
                </label>

                <div className="account-deletion-field">
                  <label htmlFor="account-deletion-confirmation">
                    Type <strong>{CONFIRMATION_TEXT}</strong> to confirm
                  </label>
                  <input
                    id="account-deletion-confirmation"
                    type="text"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                    aria-describedby="account-deletion-help"
                  />
                  <p id="account-deletion-help">The confirmation is case-sensitive.</p>
                </div>

                {error && <p className="account-deletion-error" role="alert">{error}</p>}

                <button type="submit" className="account-deletion-submit" disabled={!canSubmit}>
                  {requestState === 'submitting' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      Scheduling deletion…
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} aria-hidden="true" />
                      Schedule account deletion
                    </>
                  )}
                </button>
              </form>
            ) : (
              <section id="account-deletion-request" className="account-deletion-signin">
                <LogIn size={24} aria-hidden="true" />
                <div>
                  <h2>Submit a web deletion request</h2>
                  <p>For account security, deletion requests are accepted only from an authenticated session.</p>
                </div>
                <button type="button" onClick={() => navigate('/login')}>Sign in to continue</button>
              </section>
            )}

            <p className="account-deletion-support">
              Cannot access your account? Email{' '}
              <a href="mailto:support@bitezsnap.app?subject=Account%20deletion%20help">support@bitezsnap.app</a>.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
