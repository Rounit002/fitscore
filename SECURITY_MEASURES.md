# bitezsnap — Security Measures (Web + Android)

Compiled 2026-08-01 by reading the actual source in this repository. Every control
listed below cites the file it lives in, so it can be re-verified. Where something is
**not** implemented it is stated explicitly in [Section 12](#12-known-gaps--not-implemented)
rather than being implied as done.

Companion document: `SECURITY_HARDENING.md` (the 2026-07-28 hardening changelog).
This file is the *current state* inventory; that one is the *change history*.

---

## 1. Technology stack (what we are actually securing)

### 1.1 Backend API

| Layer | Technology | Version (package.json) |
|---|---|---|
| Runtime | Node.js (CommonJS) | — |
| HTTP framework | Express | `^5.2.1` |
| Database | PostgreSQL via `pg.Pool` | `pg ^8.20.0` |
| Password hashing | bcrypt (cost 12) | `bcrypt ^6.0.0` |
| Tokens | jsonwebtoken (HS256) | `^9.0.3` |
| Security headers | helmet | `^8.1.0` |
| CORS | cors | `^2.8.6` |
| Cookies | cookie-parser | `^1.4.7` |
| Rate limiting | express-rate-limit + express-slow-down | `^8.5.2` / `^3.0.1` |
| Input validation | Zod | `^4.4.3` |
| Job queue | BullMQ + ioredis | `^5.76.10` / `^5.10.1` |
| Image storage | Cloudinary SDK | `^2.10.0` |
| Payments (India) | Razorpay | `^2.9.6` |
| Google Play billing (legacy) | googleapis (androidpublisher) | `^144.0.0` |
| Tests | Jest + supertest | `^29.7.0` / `^6.3.4` |

There is **no ORM in the request path**. `Backend/prisma/` is a stale, unused artifact —
all queries are hand-written parameterized SQL through `pg`.

### 1.2 Web frontend

| Layer | Technology | Version |
|---|---|---|
| UI | React | `^19.2.5` |
| Build | Vite | `^8.0.10` |
| Routing | react-router-dom | `^7.15.1` |
| Styling | Tailwind CSS v4 | `^4.2.4` |
| Google sign-in | @react-oauth/google | `^0.13.5` |
| Barcode scan | html5-qrcode | `^2.3.8` |
| i18n | i18next / react-i18next | `^26.1.0` / `^17.0.7` |
| Charts | recharts | `^3.8.1` |
| Tests | Jest + React Testing Library | `^30.4.2` / `^16.3.2` |

### 1.3 Android app

| Layer | Technology | Version |
|---|---|---|
| Shell | Apache Cordova | `cordova 13.0.0`, `cordova-android ^15.1.0` |
| Package id | `com.bitezsnap.app` | v1.0.0 / versionCode 10000 |
| SDK levels | min 24 / target 36 / compile 36 | `mobile/config.xml` |
| Token storage | `cordova-plugin-secure-storage-echo` (Android Keystore) | `5.1.1` |
| Runtime permissions | `cordova-plugin-android-permissions` | `1.1.5` |
| Subscriptions | `cordova-plugin-purchases` (RevenueCat) | `8.0.7` |
| Shrinking/obfuscation | R8 / ProGuard | `mobile/resources/android/build-extras.gradle` |

### 1.4 Third-party services

Gemini (AI analysis), Cloudinary (scan images), Brevo (transactional email),
RevenueCat (subscription entitlements), Razorpay (card/UPI payments),
Google Play Billing (legacy path), OpenFoodFacts (public product data),
Render (hosting), Redis (job queue).

---

## 2. Authentication and session security

**Files:** `Backend/routes/auth.js`, `Backend/utils/tokens.js`, `Backend/middleware/auth.js`,
`Backend/config/cookies.js`

- **Password hashing:** bcrypt with configurable cost, default **12** (`BCRYPT_COST`).
- **Password policy (server-enforced, `validation/schemas.js`):** 12–128 chars and must
  contain lowercase, uppercase, digit and a special character. The web UI mirrors the
  same rule in `Frontend/src/utils/passwordPolicy.js` so the two cannot drift.
- **Access tokens:** HS256 JWT, **15-minute** default TTL, pinned `algorithm`, `issuer`
  (`fitscore-api`), `audience` (`fitscore-clients`), `subject`, and a unique `jti`.
  Verification pins the same algorithm/issuer/audience, so `alg: none` and audience-confusion
  attacks are rejected.
- **JWT secret is validated at boot:** in production `getJwtSecret()` throws if `JWT_SECRET`
  is missing or shorter than 32 bytes, and `server.js` calls it during startup so the process
  fails fast rather than running unsigned.
- **Refresh tokens:** 64 random bytes (`crypto.randomBytes`), **only the SHA-256 hash is
  stored** in `refresh_tokens`. Rotated on every use inside a `SELECT … FOR UPDATE`
  transaction.
- **Refresh-token reuse detection:** presenting an already-rotated or revoked token revokes
  the **entire token family** (`family_id`), which kills a stolen-token replay chain.
- **Global session revocation:** `users.token_version` is embedded in each access token and
  re-checked against the database on every authenticated request. Password reset and account
  deletion increment it and call `revokeUserSessions()`, logging out every device instantly.
- **Brute-force protection:** exponential account lockout after 5 failed logins
  (`30 * 2^(n-5)` seconds, capped at 900s → HTTP 423 with `Retry-After`).
- **User-enumeration resistance:**
  - Unknown email on login still runs a dummy `bcrypt.compare` against a fixed hash, so
    response timing does not reveal account existence, and the error is always
    `Invalid credentials`.
  - `POST /auth/forgot-password` always returns the same 200 message regardless of whether
    the account exists or is Google-only.
- **Password reset tokens:** 32 random bytes, stored **hashed** (SHA-256), 30-minute TTL,
  single-use (cleared on use and on expiry).
- **Google OAuth is verified server-side:** either the ID token is verified against Google's
  public keys via `OAuth2Client.verifyIdToken` with the configured audience, or the access
  token is exchanged at Google's `userinfo` endpoint. Identity comes only from Google's
  response — posting an arbitrary `email` cannot log anyone in. `email_verified === false` is
  rejected. The insecure dev fallback **refuses to run when `NODE_ENV=production`**.
- **Age gate:** minimum age 13, enforced server-side in `utils/ageCheck.js` on both
  registration and `PUT /auth/details` so it cannot be skipped by omitting DOB at signup.
- **Account deletion:** 7-day grace period (`scheduled_deletion_at`), sessions revoked
  immediately, then a transactional purge job (`purgeScheduledDeletions`, hourly) deletes
  scans, goals, conditions, feature requests and the user row, nulling shared
  `product_database` references.

### 2.1 Web vs mobile session transport

| | Web browser | Android (Cordova) |
|---|---|---|
| Access token | `HttpOnly` cookie `token`, never readable by JS | `Authorization: Bearer` header |
| Refresh token | `HttpOnly` cookie `refresh_token`, scoped to path `/auth` | request body |
| At-rest storage | browser cookie jar | **Android Keystore** via secure-storage plugin |
| CSRF defence | double-submit token | `X-Client: mobile` + Bearer (no cookie to ride) |

Cookie flags (`config/cookies.js`): `httpOnly: true`, `secure: true` in production,
`sameSite: 'none'` in production (required because the SPA and API are separate Render
origins), `lax` in development. The refresh cookie's `path=/auth` narrows where it is sent.

---

## 3. Authorization

- Every protected route passes through `middleware/auth.js` (`authenticate`).
- **Ownership is enforced per resource**, not inferred from the request:
  `utils/ownershipCheck.js#requireOwnership` throws a 403 when the row's `user_id`
  does not match `req.userId`. Used in `routes/scans.js` (read/patch/delete) and
  `routes/user.js` (`/:userId/history`, `/:userId/quota`).
- All user-scoped queries carry `WHERE user_id = $1` from the **session**, never from a
  client-supplied id.
- **Plan gating:** `middleware/requirePlan.js` reads the plan from the database on each
  call and **auto-downgrades expired plans** to `free` (`scan_limit = 5`, `is_premium = false`)
  before the check, so an expired subscriber cannot keep premium access.
- **Quota policy is centralised** in `utils/scanQuota.js`; free tier is hard-capped at
  5 scans regardless of a tampered `scan_limit` column value.
- Server-side entitlement rules that the UI also shows are re-checked on the server —
  e.g. the "first purchase only" intro plan is verified against `payment_orders`
  in `routes/payment.js`, because "hiding a button is not enforcement".

---

## 4. Input validation and injection defence

**Files:** `Backend/validation/schemas.js`, `Backend/middleware/validateRequest.js`,
`Backend/middleware/validator.js`, `Backend/middleware/profileValidator.js`

- **Zod schemas on body, query and params** for every mutating route. Schemas are
  `.strict()`, so unknown keys are rejected rather than silently forwarded — this blocks
  mass-assignment (e.g. a client cannot POST `is_premium`).
- **SQL injection:** all queries are parameterized (`$1, $2 …`) through `pg`. No string
  concatenation of request values into SQL; no `queryRawUnsafe` equivalent exists.
- **XSS:** `stripUnsafeMarkup()` removes HTML tags and control characters from every
  free-text field before storage. React escapes by default, and the audit found no
  `dangerouslySetInnerHTML`, `innerHTML` assignment, or `eval` in application code.
- **Payload/DoS bounds:**
  - JSON body limit `6mb` (`JSON_BODY_LIMIT`), urlencoded `1mb`.
  - Base64 images capped at ~5.5 MB and restricted by regex to
    `data:image/(jpeg|png|webp);base64,…`.
  - Product blobs rejected above 500 KB serialized.
  - Arrays bounded (`.max(50)` conditions/goals, `.max(100)` alternatives).
  - Numeric ranges bounded (age 0–130, height 0–300, weight 0–500, score 0–10).
- **Format pinning on sensitive ids:** Razorpay ids must match `^order_…` / `^pay_…` and the
  signature must be 64 hex chars; job ids match `^[A-Za-z0-9_-]{6,128}$`; locales match a
  BCP-47-shaped regex; positive-integer coercion for all `:id` params.
- **Email normalisation:** stored and compared lowercased, with a `UNIQUE INDEX` on
  `LOWER(email)` — closes the `User@x.com` vs `user@x.com` duplicate-account hole. Concurrent
  signups are caught by the unique constraint (`23505`), not just the pre-check.

---

## 5. Transport, headers and CORS

**Files:** `Backend/server.js`, `Backend/config/cors.js`

- **helmet** with a hardened API CSP: `default-src 'none'`, `base-uri 'none'`,
  `frame-ancestors 'none'`, `form-action 'none'`. Plus helmet's defaults
  (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`,
  cross-origin policies).
- **HSTS** in production: `max-age=31536000`, `includeSubDomains`, `preload`.
- **HTTPS enforced** in production: any non-`req.secure` request is rejected with 400
  (`trust proxy` is set to 1 so Render's `X-Forwarded-Proto` is honoured).
- **`x-powered-by` disabled** (framework fingerprint removed).
- **CORS allowlist** — explicit origins only (local dev origin is excluded in production),
  `credentials: true`, restricted `allowedHeaders`, `maxAge: 86400`. Unapproved origins are
  logged and denied rather than reflected.
- **TLS to Postgres** in production with `rejectUnauthorized` on by default and support for
  a private CA via `DB_SSL_CA`, so certificate verification does not have to be disabled for
  managed providers.
- **Request correlation:** every request gets an `X-Request-ID` (client value truncated to
  100 chars, else a UUID) used in logs and error responses.

---

## 6. CSRF protection

**File:** `Backend/middleware/csrf.js`, client side in `Frontend/src/api/client.js`

- **Double-submit cookie** pattern: `fitscore_csrf` (non-HttpOnly, 12h) must match the
  `X-CSRF-Token` header on every unsafe method. Comparison uses
  `crypto.timingSafeEqual`.
- Safe methods (`GET/HEAD/OPTIONS`) are skipped; Bearer-authenticated requests are skipped
  because there is no cookie for an attacker to ride.
- Mobile pre-auth writes are allowed via `X-Client: mobile` **only when no session cookie is
  present**. `X-Client` is a non-simple header, so a browser can only send it after a
  successful CORS preflight that an attacker's origin fails — the header itself acts as a
  CSRF defence, and cookie-authenticated writes still require the token.
- Webhook endpoints are exempted (server-to-server, separately authenticated — see §7).
- The frontend fetch wrapper fetches `/auth/csrf` lazily and attaches the header
  automatically to all unsafe browser requests.

---

## 7. Payments and subscription integrity

**Files:** `Backend/routes/payment.js`, `Backend/routes/revenueCatSubscriptions.js`,
`Backend/routes/billing.js`, `Backend/config/plans.js`

- **Prices never come from the client.** Only a `planId` from a fixed enum is accepted; the
  amount is looked up server-side, so a tampered request cannot change what is charged.
- **The purchased plan is persisted on the order** and read back at verify time, so a user
  cannot pay for the 7-day tier and claim lifetime.
- **Razorpay signature verification:** HMAC-SHA256 over `order_id|payment_id` compared with
  `crypto.timingSafeEqual`.
- **Atomic, idempotent verification:** `SELECT … FOR UPDATE` inside a transaction, order
  ownership checked against the session user (403 otherwise), and an already-`paid` order
  returns `{ duplicate: true }` instead of re-granting entitlement.
- **RevenueCat: client `customerInfo` is never trusted.** The server re-fetches the
  subscriber from RevenueCat's REST API with the secret key and mirrors the entitlement
  itself. The client must also claim its own `appUserId` (`nutriscan_<userId>`) or gets 403.
- **RevenueCat webhook is triple-checked:** shared `Authorization` bearer (timing-safe),
  HMAC-SHA256 signature over `t.<rawBody>` with a 300-second timestamp window (replay
  protection), and an optional `app_id` allowlist. The raw body is captured verbatim in
  `express.json`'s `verify` hook so signature computation is byte-exact.
- **Webhook idempotency:** `webhook_events (provider, event_id)` primary key with
  `INSERT … ON CONFLICT DO NOTHING` claiming; duplicates return 200 without reprocessing,
  and failures release the claim so a retry can succeed.
- **Google Play (legacy path):** purchase tokens are validated server-to-server through
  `androidpublisher` using a service account; `POST /billing/validate` requires
  authentication.

---

## 8. Rate limiting, abuse and cost control

**File:** `Backend/middleware/rateLimiter.js`

| Limiter | Window | Limit (default env override) |
|---|---|---|
| Global (all routes) | 15 min | 300 / IP (`GLOBAL_RATE_LIMIT`) |
| Login | 15 min | 10 / IP, successful requests skipped |
| Signup | 60 min | 5 / IP |
| Password reset | 30 min | 5 / IP |
| AI analyze (per IP) | 10 min | 20 / IP |
| AI analyze (per user) | 10 min | 12 / authenticated user |

- **Progressive slowdown** in addition to hard limits: `authSlowDown` adds 500 ms per
  attempt after 3 (max 5 s) on auth routes; `apiSlowDown` adds 100 ms after 100 requests
  (max 2 s) globally.
- Limit breaches emit a structured `rate_limit_exceeded` security log and return a
  `Retry-After` value.
- Standard draft-8 rate-limit headers; legacy headers off.
- **AI spend containment:** per-user scan quotas (`utils/scanQuota.js`), model fallback with
  a 60-second global cooldown after an upstream 429, and result caching so a repeat scan does
  not re-bill the model.

---

## 9. Logging, privacy and data handling

**File:** `Backend/utils/securityLogger.js`

- **Structured JSON security events:** `login_failed`, `login_locked`, `login_succeeded`,
  `authentication_missing/invalid/revoked`, `csrf_rejected`, `rate_limit_exceeded`,
  `refresh_failed`, `password_reset_requested/completed`, `account_deletion_*`.
- **PII is never logged in the clear.** A redaction denylist drops `password`, `token`,
  `refreshToken`, `authorization`, `cookie`, `email`, `name`, `profile`, `imageBase64`,
  `purchaseToken`. IPs and user ids are stored as truncated SHA-256 hashes
  (`ipHash`, `userIdHash`), and free-text detail values are truncated to 200 chars.
- **Session metadata is hashed too:** `refresh_tokens.ip_hash` / `user_agent_hash` are
  SHA-256 prefixes, so binding data exists without retaining raw IPs.
- **Generic error responses:** the global error handler returns `Internal server error`
  unless the error carries an explicit safe `status`/message — no stack traces or driver
  errors reach the client.
- **Secrets stay out of git (verified):** `Backend/.env`, `mobile/build.json` and
  `mobile/*.keystore` are all `.gitignore`d and **none of them are tracked by git**
  (`git ls-files --error-unmatch` returns "did not match any file(s) known to git" for all
  three). Only `.env.example` templates are committed. Render env vars use `sync: false`.
- **Fail-closed startup:** `startServer()` awaits `initDb()` before listening, so the
  service never serves traffic without its security tables/columns
  (`refresh_tokens`, `webhook_events`, `payment_orders`, `token_version`, `locked_until`, …).

---

## 10. Android application hardening

**Files:** `mobile/config.xml`, `mobile/resources/android/*`, `Frontend/src/api/client.js`

- **Cleartext traffic disabled two ways:** `android:usesCleartextTraffic="false"` in the
  manifest *and* a `network_security_config.xml` with
  `cleartextTrafficPermitted="false"` and system-only trust anchors — the config file also
  protects devices whose vendor defaults are permissive.
- **Backup/data-extraction disabled:** `android:allowBackup="false"` and
  `android:fullBackupContent="false"`, so ADB backup cannot lift app data (including the
  token store) off the device.
- **Tokens in the Android Keystore:** `cordova-plugin-secure-storage-echo` holds the access
  and refresh tokens. If the plugin is unavailable the client **fails closed** — tokens stay
  memory-only and the user re-authenticates after restart, instead of falling back to
  extractable `localStorage`. The legacy `nutriscan_token` localStorage key is actively
  deleted on init.
- **Secure origin, not `file://`:** the SPA is served from `https://localhost`
  (`scheme`/`hostname` preferences) so the WebView treats it as a secure context;
  `AndroidInsecureFileModeEnabled` is `false`.
- **Navigation and network allowlists:** `allow-navigation` is limited to
  `https://localhost/*`; `<access origin>` is an explicit allowlist (own API, OpenFoodFacts,
  RevenueCat, Cloudinary, googleapis). External links use `allow-intent`, so they open in the
  system browser rather than inside the app WebView.
- **Minimal permissions:** only `CAMERA` and `INTERNET`; camera is declared
  `required="false"`. Camera access is requested at runtime through
  `cordova-plugin-android-permissions` (`Frontend/src/utils/nativePermissions.js`) and
  degrades to a no-op on web.
- **Release builds are minified/obfuscated:** R8 with `minifyEnabled true`,
  `shrinkResources true`, and `proguard-rules.pro` keeping only the Cordova
  `@JavascriptInterface` bridge members.
- **Modern SDK baseline:** minSdk 24, target/compile SDK 36.
- **Signing material out of the repo:** `build.json` and the keystore are gitignored and
  untracked.

---

## 11. Testing as a security control

Security-relevant behaviour is covered by unit/integration tests that live next to the code:

```
Backend/middleware/  auth.test.js  csrf.test.js  rateLimiter.test.js
                     requirePlan.test.js  requireSubscription.test.js
                     validator.test.js  profileValidator.test.js
Backend/config/      cors.test.js  cookies.test.js
Backend/utils/       tokens.test.js  ownershipCheck.test.js
                     ageCheck.test.js  scanQuota.test.js
Backend/routes/      auth  scans  analyze  payment  billing
                     revenueCatSubscriptions  user  features (.test.js)
```

Run them with:

```powershell
cd Backend; npm.cmd test
cd Frontend; npm.cmd test
```

---

## 12. Known gaps / NOT implemented

Listed so nobody assumes coverage that does not exist.

1. **No security headers on the web frontend.** A repo-wide grep for
   `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`
   returns **zero matches**. The hardened CSP in `server.js` applies to the **API only**;
   the Vite SPA served by Render has no CSP, no frame-busting and no
   `Permissions-Policy`. The frontend block in `render.yaml` is commented out, so no
   `headers:` rules are deployed. → Add a CSP + header set for the static site.
2. **No email verification on signup.** Registration issues a session immediately; an
   address is never proven to belong to the registrant.
3. **No MFA / 2FA** for any account, including admin-flavoured views.
4. **`SameSite=None` on session cookies** is required by the split-origin Render deployment,
   which means CSRF safety rests entirely on the double-submit token in §6. Same-site
   hosting (API behind a path on the SPA domain) would allow `SameSite=Lax` as defence in
   depth.
5. **`middleware/requireSubscription.js` reads `req.user`**, which no middleware in the
   mounted app populates (`authenticate` sets `req.userId`). It would 401 unconditionally if
   mounted. It is currently unused — dead code that should be deleted or fixed.
6. **API hostname is inconsistent across configs.** The Android build calls
   `https://fitscore-rqgb.onrender.com` (`Frontend/.env.cordova`, matching the
   `<access origin>` allowlist in `config.xml`), while `render.yaml` defines the service as
   `fitscan-api` and its commented frontend block points at
   `https://fitscan-api.onrender.com`. The repo alone cannot say which host is live —
   confirm and converge, because the `<access origin>` allowlist silently blocks any host
   not listed.
7. **RevenueCat entitlement id** defaults to `premium` on the backend
   (`REVENUECAT_ENTITLEMENT_ID`); this must match the RevenueCat dashboard exactly or
   entitlements silently resolve to "not premium".
8. **No certificate pinning** in the Android app (system trust anchors only). Acceptable for
   most threat models, but it is not pinned.
9. **No automated dependency/secret scanning** (Dependabot, `npm audit` gate, secret scanner)
   is configured in CI.
10. **Legacy JWTs without `tokenVersion`** are accepted until their natural expiry, so global
    revocation is not retroactive for them. Rotating `JWT_SECRET` forces it.
11. **Profile pictures are stored as base64 inside the `users.profile` JSONB**, not on
    Cloudinary. Validated as an image data URL and size-capped, but content is not
    re-encoded/sanitised server-side.
12. **`google-auth-library` is required at runtime but is not a declared dependency.**
    `routes/auth.js` does `require('google-auth-library')` to verify Google ID tokens, yet it
    appears in `package-lock.json` only as a transitive dependency of `googleapis`. A future
    `googleapis` bump could drop it and break Google sign-in verification. → Add it to
    `Backend/package.json` explicitly.

---

## 13. Quick verification commands

```powershell
# Security headers + HTTPS enforcement on the API
curl -I https://<api-host>/

# CSRF must reject a cookie-authenticated write without the header
curl -X POST https://<api-host>/scans -b "token=<jwt>" -H "Content-Type: application/json" -d "{}"

# Rate limiter
1..12 | ForEach-Object { curl -s -o NUL -w "%{http_code}`n" -X POST https://<api-host>/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.co","password":"wrong-password-1A!"}' }

# Confirm no secrets are tracked
git ls-files | Select-String -Pattern "\.env$|keystore|build\.json"
```
