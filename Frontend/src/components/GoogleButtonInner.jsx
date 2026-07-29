import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { API } from '../api/client.js';
import GoogleIcon from './GoogleIcon.jsx';

/**
 * The part of the Google sign-in button that actually calls the Google hook and
 * imports the ESM-only `@react-oauth/google` package.
 *
 * It lives in its own module so the parent (GoogleSignInButton) can lazy-load it
 * only when a client id is configured. That keeps the ESM import out of the
 * module graph in environments without a key — notably the jest suites, which
 * render the auth pages without a GoogleOAuthProvider.
 */
export default function GoogleButtonInner({ onLogin, onError, label }) {
  const [isBusy, setIsBusy] = useState(false);

  const exchange = async (body) => {
    setIsBusy(true);
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      onLogin(data.user, data.token ?? null, data.deletionCancelled, data.refreshToken ?? null);
    } catch (err) {
      console.error('Google sign-in failed:', err);
      onError?.(err.message || 'Google sign-in failed');
    } finally {
      setIsBusy(false);
    }
  };

  const exchangeAccessToken = async (accessToken) => {
    setIsBusy(true);
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileRes.ok) throw new Error('Could not read Google profile');
      const profile = await profileRes.json();
      await exchange({
        email: profile.email,
        name: profile.name,
        googleId: profile.sub,
        accessToken,
      });
    } catch (err) {
      console.error('Google sign-in failed:', err);
      onError?.(err.message || 'Google sign-in failed');
      setIsBusy(false);
    }
  };

  // Implicit flow returns an access_token; the backend verifies it against
  // Google's userinfo endpoint, so the identity is trusted server-side.
  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: (tokenResponse) => exchangeAccessToken(tokenResponse.access_token),
    onError: () => onError?.('Google sign-in was cancelled or failed.'),
  });

  return (
    <button
      type="button"
      className="auth-google-btn"
      onClick={() => login()}
      disabled={isBusy}
      aria-busy={isBusy}
    >
      {isBusy ? <span className="btn-spinner" aria-hidden="true" /> : <GoogleIcon />}
      <span>{isBusy ? 'Connecting…' : label}</span>
    </button>
  );
}
