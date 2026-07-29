import { Suspense, lazy } from 'react';
import GoogleIcon from './GoogleIcon.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Lazy so the ESM-only @react-oauth/google package is pulled into the graph only
// when a client id is configured. Without a key (e.g. jest suites that render the
// auth pages without a provider) nothing from that package is imported.
const GoogleButtonInner = lazy(() => import('./GoogleButtonInner.jsx'));

/** Shared divider so the button reads as an alternative to the form above it. */
function Divider() {
  return (
    <div className="auth-divider" aria-hidden="true">
      <span>or</span>
    </div>
  );
}

/**
 * Google sign-in button.
 *
 * The button is ALWAYS rendered so the pages have a consistent layout and the
 * Google mark is visible. Only the OAuth wiring is conditional: with a client id
 * configured it becomes a working sign-in control; without one it renders
 * disabled with an explanatory title, rather than silently disappearing.
 */
export default function GoogleSignInButton({ onLogin, onError, label = 'Continue with Google' }) {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <>
        <Divider />
        <button
          type="button"
          className="auth-google-btn"
          disabled
          title="Google sign-in is not configured on this build (VITE_GOOGLE_CLIENT_ID is unset)."
        >
          <GoogleIcon />
          <span>{label}</span>
        </button>
      </>
    );
  }

  return (
    <>
      <Divider />
      <Suspense
        fallback={
          <button type="button" className="auth-google-btn" disabled>
            <GoogleIcon />
            <span>{label}</span>
          </button>
        }
      >
        <GoogleButtonInner onLogin={onLogin} onError={onError} label={label} />
      </Suspense>
    </>
  );
}
