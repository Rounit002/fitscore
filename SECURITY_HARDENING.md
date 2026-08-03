# bitezsnap production security hardening

Implemented on 2026-07-28. This document describes the code that is now in the repository and the deployment work that remains.

## Important stack correction

The running backend does **not** use Prisma. It uses `pg.Pool` and parameterized PostgreSQL queries. `Backend/prisma/schema.prisma` is an unused/stale artifact, and the unused Prisma packages were removed. The audit found no `$queryRawUnsafe`, SQL string concatenation with request values, `dangerouslySetInnerHTML`, or `eval` in the mounted application code.

## Breaking/deployment-sensitive changes

These changes are intentionally security-sensitive and must be accounted for during deployment:

- New and reset passwords must be 12–128 characters and contain lower-case, upper-case, numeric, and special characters. Existing password hashes still work.
- Browser write requests now require a double-submit CSRF token. The checked-in frontend obtains it from `GET /auth/csrf` and sends `X-CSRF-Token`; any separate API client must do the same or use Bearer authentication.
- Access tokens expire after 15 minutes. Refresh tokens rotate on every use and are valid for 30 days by default.
- `POST /billing/validate` and `GET /api/analyze/status/:jobId` now require authentication; analysis jobs are owner-scoped.
- Production HTTP is rejected and Android cleartext traffic is disabled. All production dependencies must be HTTPS.
- RevenueCat webhooks now require both the configured Authorization header and RevenueCat HMAC signature. Google RTDN requires a Google-signed OIDC token with the configured audience and service-account identity.
- The new `refresh_tokens`, `webhook_events`, and `payment_orders` tables and new user security columns must exist. `server.js` creates them at startup, and `Backend/database-schema.sql` contains the reproducible schema.
- Legacy JWTs without a token version are accepted only until their existing expiry to avoid an immediate forced logout. Rotate `JWT_SECRET` if immediate global revocation is required.

## Phase 1 — Authentication and session security

Files/routes affected:

- `Backend/routes/auth.js`: registration, login, Google login, refresh, logout, password reset, account deletion.
- `Backend/utils/tokens.js`: JWT creation/verification and refresh-token rotation/reuse detection.
- `Backend/config/cookies.js`: browser cookie policy.
- `Backend/middleware/auth.js`: cookie/Bearer authentication and token-version revocation.
- `Backend/database-schema.sql` and `Backend/server.js`: lockout/session columns and tables.
- Ownership enforcement in `Backend/routes/scans.js`, `Backend/routes/features.js`, `Backend/routes/user.js`, `Backend/routes/analyze.js`, `Backend/routes/payment.js`, and `Backend/routes/billing.js`.
- `Frontend/src/api/client.js`: web cookies, Android Keystore tokens, automatic refresh rotation.

Exact implemented controls:

```js
// Access tokens: signed JWT, fixed algorithm/issuer/audience, 15-minute default.
jwt.sign({ userId, tokenVersion, type: 'access' }, secret, {
  algorithm: 'HS256', expiresIn: '15m', issuer: 'fitscore-api',
  audience: 'fitscore-clients', subject: String(userId), jwtid: crypto.randomUUID(),
});

// Browser session cookies.
{ httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax' }
```

Refresh tokens are 64 random bytes, only SHA-256 hashes are stored, every refresh rotates the token in a transaction, and replay revokes the entire token family. Passwords use bcrypt cost 12. Login uses a dummy bcrypt comparison for unknown users, returns generic failures, and applies exponential account lockout after five failures (capped at 15 minutes). Password reset and account deletion revoke all sessions. Every resource lookup/update/delete includes the authenticated user ID; payment and billing user IDs come only from the authenticated session.

One-line test:

```powershell
cd Backend; npm.cmd test -- --runInBand --silent routes/auth.test.js middleware/auth.test.js utils/tokens.test.js routes/scans.test.js routes/analyze.test.js
```

## Phase 2 — Rate limiting and abuse prevention

Files/routes affected:

- `Backend/middleware/rateLimiter.js`.
- `Backend/server.js` global limiter/slowdown.
- `Backend/routes/auth.js` login/signup/password-reset limiters and auth slowdown.
- `Backend/routes/analyze.js` per-IP and per-authenticated-user limits.

Exact defaults:

```text
Global: 300 requests / 15 minutes / IP
Login: 10 failed requests / 15 minutes / IP
Signup: 5 requests / hour / IP
Password reset: 5 requests / 30 minutes / IP
AI/analyze: 20 / 10 minutes / IP and 12 / 10 minutes / authenticated user
Auth slowdown: starts after 3 requests, adds up to 5 seconds
Global slowdown: starts after 100 requests, adds up to 2 seconds
```

Limit keys use `express-rate-limit`'s IPv6-safe `ipKeyGenerator`; the expensive route additionally keys by `req.userId`. Limit hits produce redacted structured security events and standard RateLimit/Retry-After response headers.

One-line test:

```powershell
$env:NODE_ENV='test'; $env:RATE_LIMIT_ENABLED='true'; cd Backend; npm.cmd test -- --runInBand --silent middleware/rateLimiter.test.js
```

## Phase 3 — Input validation and injection prevention

Files/routes affected:

- `Backend/validation/schemas.js` and `Backend/middleware/validateRequest.js` provide shared strict Zod body/query/param validation.
- `Backend/middleware/validator.js` and `Backend/middleware/profileValidator.js` validate bounded AI images, product data, locale, profile data, and stored text.
- All mounted route modules now validate request-controlled bodies, query strings, and identifiers.
- `Frontend/src/utils/passwordPolicy.js`, `Frontend/src/components/SignUp.jsx`, and `Frontend/src/components/ResetPassword.jsx` mirror the server password requirements for usability.

Schemas reject unknown properties on security-sensitive payloads, cap string/array/image sizes, validate numeric bounds and IDs, strip HTML tags/control characters from stored plain text, and restrict uploaded data URIs to JPEG/PNG/WebP. PostgreSQL values remain positional parameters (`$1`, `$2`, …); the only dynamic migration identifiers/types are hardcoded internal constants.

One-line test:

```powershell
cd Backend; npm.cmd test -- --runInBand --silent middleware/validator.test.js middleware/profileValidator.test.js routes/features.test.js routes/payment.test.js
```

## Phase 4 — Headers, CORS, HTTPS, and CSRF

Files/routes affected:

- `Backend/server.js`: Helmet, strict API CSP, HSTS, HTTPS enforcement, disabled `X-Powered-By`, proxy trust, request/body limits.
- `Backend/config/cors.js`: explicit web/Cordova origin allowlist with credentials.
- `Backend/middleware/csrf.js` and `GET /auth/csrf`: timing-safe double-submit CSRF protection.
- `Frontend/src/api/client.js`: automatic CSRF header for unsafe browser requests.

Exact policy highlights:

```js
app.disable('x-powered-by');
app.set('trust proxy', 1); // production Render proxy
helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});
```

Production CORS excludes localhost and accepts only `FRONTEND_URL`, `FRONTEND_URLS`, the deployed bitezsnap URL, and the Cordova `https://localhost` origin. Cookie-authenticated unsafe methods require an `X-CSRF-Token` value that timing-safely matches the CSRF cookie. Bearer-authenticated mobile/server requests are not vulnerable to cookie CSRF and bypass this check.

One-line test:

```powershell
cd Backend; npm.cmd test -- --runInBand --silent config/cors.test.js config/cookies.test.js middleware/csrf.test.js
```

## Phase 5 — Secrets and configuration

Files affected:

- `.gitignore` already ignores `.env` files; verified `Backend/.env` is untracked.
- `Backend/.env.example` now contains placeholders only and documents every security/payment variable.
- `Frontend/src/api/client.js` contains only public API URLs/client configuration; server secrets are not shipped in Vite or Cordova output.
- Server-only Google Play, Razorpay, RevenueCat, Cloudinary, Brevo, Gemini, database, and JWT credentials remain backend environment variables.

Secrets that should be rotated before production because live-looking values exist in local files or prior project history: PostgreSQL/Supabase password, JWT secret, Gemini API key, Cloudinary API secret, Razorpay secret, Brevo API key, RevenueCat secret/webhook values, Google service-account key, and the Android signing keystore/password. The deleted tracked `havenn/build.json` previously contained a signing password; rotate the keystore credentials and purge the historical secret with a history-rewrite tool before sharing the repository.

One-line test:

```powershell
git grep -n -I -E "(BEGIN PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|sk_(live|test)_[0-9A-Za-z]+|AKIA[0-9A-Z]{16})" -- ':!*.lock'
```

## Phase 6 — Cordova/Android hardening

Files affected:

- `mobile/config.xml`: explicit navigation/network/intent allowlists, HTTPS app origin, no insecure file mode, no cleartext, no backup.
- `mobile/resources/android/xml/network_security_config.xml`: cleartext denied.
- `mobile/resources/android/build-extras.gradle` and `mobile/resources/android/proguard-rules.pro`: release R8/minification/resource shrinking.
- `mobile/package.json`: `cordova-plugin-secure-storage-echo` and RevenueCat plugin.
- `Frontend/src/api/client.js`: Android Keystore-backed access/refresh token storage; memory-only fail-closed fallback.

Release WebView debugging is disabled by Cordova's release build defaults; no code enables `WebView.setWebContentsDebuggingEnabled`. External intents are restricted to bitezsnap, Google Play, Google Accounts, telephone, email, and Play Market. No custom deep-link scheme is currently registered, so there is no custom scheme handler to inject into.

Root/tamper detection is deliberately **not claimed as complete**. Client-only root checks are bypassable. A production payment build should add Google Play Integrity in Play Console/Google Cloud, obtain an integrity token from native code, and verify it server-side before granting high-risk entitlements. RevenueCat/Google server verification already prevents the app client from directly granting subscription status, but device integrity remains an external deployment integration.

One-line test:

```powershell
cd mobile; npm.cmd run prepare:android; Select-String platforms/android/app/src/main/AndroidManifest.xml -Pattern 'usesCleartextTraffic="false"|allowBackup="false"|networkSecurityConfig'
```

## Phase 7 — Webhook and payment security

Files/routes affected:

- `Backend/routes/revenueCatSubscriptions.js`: server-side entitlement fetch, exact bearer check, RevenueCat HMAC/timestamp/replay validation, app ID allowlist, event idempotency.
- `Backend/routes/billing.js`: authenticated purchase validation, Google RTDN OIDC identity verification, product allowlist, bounded RTDN parsing, event idempotency.
- `Backend/routes/payment.js`: Razorpay order ownership, amount binding, timing-safe signature verification, transactional/idempotent completion.
- `Backend/database-schema.sql`: unique provider/event and payment/order records.

RevenueCat signature verification uses the raw body, `t`/`v1` HMAC-SHA256 format, a five-minute replay window, and constant-time comparison. Both webhook integrations claim a unique event ID before processing. Subscription state is fetched from RevenueCat or Google server-to-server; client-provided entitlement/customer-info objects are no longer trusted.

One-line test:

```powershell
cd Backend; npm.cmd test -- --runInBand --silent routes/revenueCatSubscriptions.test.js routes/billing.test.js routes/payment.test.js
```

## Phase 8 — Monitoring and dependency hygiene

Files affected:

- `Backend/utils/securityLogger.js`: JSON security events with hashed IP/user identifiers and recursive secret/PII redaction.
- `Backend/middleware/auth.js`, `Backend/middleware/rateLimiter.js`, `Backend/middleware/csrf.js`, and `Backend/routes/auth.js`: auth failure, lockout, CSRF rejection, and limiter events.
- `Backend/utils/mailer.js`: removed reset-token/address/body logging.
- Backend/frontend/mobile lockfiles: safe dependency updates; unused Prisma and image-search packages removed.

Current production dependency audit status:

- Backend: 7 moderate advisory nodes in the `googleapis` transitive tree, rooted in `uuid`; the current audit reports no complete fix for the direct `googleapis` dependency. The vulnerable UUID buffer-writing APIs are not called by bitezsnap, but the package tree should be upgraded as soon as Google publishes a resolved release. A longer-term option is replacing the broad `googleapis` package with the narrower Google Auth/Android Publisher clients after integration testing.
- Frontend: 2 high advisory nodes (`react-router-dom` and transitive `react-router`) for an RSC action CSRF issue; the current audit reports no fix. This Vite SPA does not enable React Server Components/actions, which reduces reachability, but the patched router release should still be installed and regression-tested when available.
- Mobile: 0 known production dependency vulnerabilities.
- Development-only Jest dependency trees still report additional advisories; they are not shipped, but should be updated in a dedicated test-toolchain upgrade.

Recommended lightweight alerting: send Render JSON logs to a managed log drain such as Better Stack, Datadog, or Grafana Cloud; alert on spikes in `login_failed`, `account_locked`, `authentication_invalid`, `csrf_rejected`, `rate_limit_exceeded`, and webhook 401/403/5xx events. Never alert with raw request bodies, cookies, authorization headers, email addresses, purchase tokens, or reset tokens.

The concrete Better Stack drain, alert thresholds, event-name drift, webhook visibility blocker, production-variable cross-check, and Android release-CI blocker are tracked in `MONITORING_SETUP.md`.

One-line test:

```powershell
cd Backend; npm.cmd audit --omit=dev; cd ..\Frontend; npm.cmd audit --omit=dev; cd ..\mobile; npm.cmd audit --omit=dev
```

## Verification completed

- Backend: 21 suites, 171 tests passed.
- Frontend: 16 suites, 160 tests passed.
- Frontend Vite production build passed.
- Cordova prepare/sync passed and generated Android manifest contained the cleartext/backup/network-security restrictions.
- Native Android release build reached Gradle setup but could not run because `ANDROID_HOME` points to a non-existent local SDK directory. This is an environment prerequisite, not a source/build error.
- Static scan found no active JWT fallback secret, token storage in localStorage, `$queryRawUnsafe`, `dangerouslySetInnerHTML`, wildcard production CORS, or wildcard Cordova navigation/intent rule. The one `localStorage` token reference removes a legacy token.

## Required production environment

At minimum configure:

```text
NODE_ENV=production
FRONTEND_URL=https://fitscore-6hqp.onrender.com
JWT_SECRET=<at least 32 cryptographically random bytes>
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD / DB_SSL
REVENUECAT_SECRET_KEY / REVENUECAT_WEBHOOK_AUTH / REVENUECAT_WEBHOOK_SIGNING_SECRET
REVENUECAT_APP_IDS / REVENUECAT_ENTITLEMENT_ID
GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_PACKAGE_NAME
GOOGLE_RTDN_AUDIENCE / GOOGLE_RTDN_SERVICE_ACCOUNT / GOOGLE_SUBSCRIPTION_IDS
```

Use `Backend/.env.example` as the complete checklist. Never place server secrets in variables prefixed with `VITE_`; Vite embeds those values into the browser and APK bundles.
