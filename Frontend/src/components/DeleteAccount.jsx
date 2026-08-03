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
  ShieldAlert,
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
                  This is the official account-deletion request page for the bitezsnap web and Android app.
                  You must sign in so we can verify which account should be deleted.
                </p>
              </div>
            </section>

            <section className="account-deletion-grid" aria-label="What happens after a deletion request">
              <article>
                <Clock3 size={22} aria-hidden="true" />
                <h2>Seven-day safety window</h2>
                <p>Your request is scheduled immediately. Sign in within seven days to cancel it.</p>
              </article>
              <article>
                <ShieldAlert size={22} aria-hidden="true" />
                <h2>Personal records removed</h2>
                <p>Your account, health profile, scan history, saved results, and authored requests are removed.</p>
              </article>
              <article>
                <Database size={22} aria-hidden="true" />
                <h2>Limited records may remain</h2>
                <p>Anonymised shared product facts, provider transaction records, and legally required records may remain.</p>
              </article>
            </section>

            <aside className="account-deletion-notice">
              <FileWarning size={22} aria-hidden="true" />
              <div>
                <h2>Before you continue</h2>
                <p>
                  Deletion cannot be undone after the seven-day window. Some previously uploaded scan-image
                  files may remain at the image host after the matching app record is removed. Read the{' '}
                  <button type="button" onClick={() => navigate('/privacy-policy')}>Privacy Policy</button>{' '}
                  for the current retention details.
                </p>
              </div>
            </aside>

            {userAuth ? (
              <form className="account-deletion-form" onSubmit={handleDeletionRequest} noValidate>
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
              <section className="account-deletion-signin">
                <LogIn size={24} aria-hidden="true" />
                <div>
                  <h2>Sign in to submit your request</h2>
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
