# NutriScan Codebase Review

Reviewed server (Express + Postgres + BullMQ + Gemini), client (React 19 + Vite), middleware, config, and packaging. Findings below, grouped by severity.

---

## Critical Issues (security & correctness)

- **Rate limiters disabled in production code path.** `server/middleware/rateLimiter.js` exports no-op middlewares. They're wired into `/auth` and `/api/analyze` in `server/server.js` (lines 321–324), so brute-force login and Gemini quota abuse are wide open. `express-rate-limit` is already a dependency — restore real limiters keyed on IP and userId.

- **Hardcoded JWT fallback secret.** Repeated literal `'fallback_secret_key'` / `'your_jwt_secret_key'` in `server/middleware/auth.js`, `server/routes/auth.js`, `server/routes/scans.js`, `server/routes/analyze.js`, `server/routes/payment.js`. If `JWT_SECRET` is missing, server silently signs/verifies with a known string — full auth bypass. Fail-fast at boot if `JWT_SECRET` is missing, and centralize the constant in one module.

- **Google "OAuth" endpoint does no token verification.** `server/routes/auth.js` `/google` (lines 243–281) trusts client-supplied `email`, `name`, `googleId` blindly. Anyone can POST `{email: "victim@x.com"}` and impersonate that user (or auto-create one). Use `google-auth-library` to verify a Google ID token server-side.

- **Google account hijack via email match.** Same handler logs in any existing user whose email matches, even if their account was created with a password and has no `google_id`. Combined with the above, this is a takeover path. Require `google_id` match (or first-time link with verified ID token).

- **Account deletion lacks reauth.** `DELETE /auth/account` (`server/routes/auth.js:492`) doesn't require password reauth. Consider requiring password/recent-login confirmation.

- **`SameSite=strict` breaks cross-origin cookie auth in prod.** `server/routes/auth.js:115-120`. If frontend and API are on different domains (typical deploy), the cookie is never sent on initial top-level request flows. Use `sameSite: 'none'` + `secure: true` in production.

- **Process-local cooldown / state.** `rateLimitCooldownUntil` in `server/routes/analyze.js:93` is process-local — useless across multiple workers/replicas. Move to Redis if scaling horizontally.

- **Cache key ignores `userProfile`.** `server/routes/analyze.js:505-527` returns cached translation for any user with same product+lang, even though the prompt analyzes against user's age/conditions/goals. Two different users will see each other's verdicts/score/sideEffects. The cache should key on `(product_key, lang, profile_hash)` or store generic data only and personalize separately.

- **Quota not enforced on cache-hit path.** Same block returns immediately after cache hit without `scans_used` increment, so users can scan unlimited cached products.

- **Quota race condition.** `checkQuota` reads then `processImageAnalysis`/`processTextAnalysis` later increments — concurrent requests bypass the limit. Use a single atomic `UPDATE ... WHERE scans_used < scan_limit RETURNING ...`.

- **Root `.env` not gitignored.** Root `.gitignore` doesn't exclude `.env`/`.env.local`. Server has its own `.gitignore` (good). Add `.env*` to root.

- **`express.json({ limit: '10mb' })` on all routes** including auth — large-payload DoS surface. Apply 10mb only to image/profile-picture endpoints; keep auth/payment at default.

- **Profile picture stored as base64 in `users.profile` JSONB** (`server/routes/auth.js:411-465`). Bloats every `SELECT users` (`/auth/me`, leaderboard joins, etc.) with multi-MB blobs. Cloudinary is already wired up — upload there and store the URL.

- **Leaderboard exposes all users' raw `name`** (`server/routes/auth.js:479-489`) — minor PII concern, no pagination, no rate limit.

---

## High-priority gaps

- **Prisma + raw SQL coexist.** Prisma is installed (`server/package.json`, `prisma.config.ts`) but every route uses `pg.Pool` directly. Either remove Prisma or migrate to it; the hybrid wastes deps and confuses migrations.

- **Schema migrations via runtime `addColumnIfMissing`.** `server/server.js:166-208` mutates schema on every boot. Fragile, slow, and hides drift. Adopt Prisma Migrate or `node-pg-migrate`.

- **Circular require trick.** `server/routes/analyze.js:341,419` does `require('../server')` to get the pool while `server.js` mounts analyze routes — works, but brittle. Use `req.pool` (already injected) consistently, like `scans.js` does.

- **`server.js` does too much.** DB init, cleanup jobs, schema, route wiring all in one 353-line file. Split: `db/init.js`, `jobs/cleanup.js`, `app.js`.

- **No tests.** `server/package.json` test script literally errors out. No Jest/Vitest. Critical surface (auth, payment signature verification, quota) is untested.

- **No CI / linting on server.** Only the frontend has ESLint. Add eslint + a basic `npm test` pipeline.

- **No structured request logging.** `console.log/error` everywhere. Use `pino` or `morgan` with levels and request IDs.

- **No global Express error handler.** A thrown error in async middleware (after `next(err)`) returns nothing meaningful. Add `app.use((err, req, res, _next) => ...)`.

- **404 handler logs every miss as `console.error`** (`server/server.js:332-335`) — pollutes error monitoring.

- **CORS allows only one origin** (`server/server.js:307-310`). Use an allowlist for staging/prod/preview.

- **Helmet defaults may break Cloudinary/Razorpay images/scripts.** Configure CSP explicitly or document why disabled.

- **`App.jsx` is 675 lines / 24 KB.** Single-file SPA shell + view router. Split into routes (consider `react-router`) and feature modules. `src/index.css` is 176 KB — likely unprune-able utility CSS that should be Tailwind-purged via the `@tailwindcss/vite` content config.

- **`Profile.jsx` is 43 KB, `Dashboard.jsx` 36 KB.** Decompose: extract sub-components, hooks, and forms.

- **Cleanup `setInterval` doesn't clear on shutdown.** No SIGTERM handler — graceful shutdown missing for the worker, pool, and intervals.

- **Worker concurrency hardcoded.** `server/config/worker.js:26` `concurrency: 2`. Make env-driven.

- **In-memory job store unbounded.** `jobsStore` Map in `server/config/queue.js:8` never evicts completed/failed jobs — slow memory leak. Add TTL eviction.

---

## Medium-priority improvements

- **Verdict heuristic in `normalizeResult`** (`server/routes/analyze.js:204-256`) is fragile English-only keyword matching and runs after an LLM that can already follow a schema. Use Gemini's `responseSchema` / JSON mode and drop the manual repair logic.

- **Truncated-JSON "emergency repair"** (`server/routes/analyze.js:181-187`) invents `"alternatives": []` blindly — could produce wrong results. Better to retry once with a higher token cap.

- **Hardcoded `MODEL_LIST`** (`server/routes/analyze.js:86-90`) — make configurable.

- **Two slightly different prompts** ("Nutri Scan" vs "FitScan") in image vs text analyzers. Brand inconsistency; consolidate.

- **`scans` table duplicates data already in `product_database`.** Consider `scans` referencing `product_database.id` and keeping only per-user fields (timestamp, servings, score-at-scan-time).

- **`food_database_flag` refresh job is wasteful.** Periodic full-table rewrite every 5 min (`server/server.js:34-58`). Replace with a generated column or a check at write time only.

- **`shouldShowInFoodDatabase` logic duplicated** in scans.js and as raw SQL in the periodic flag refresh — they will drift.

- **Frontend polling at 1.5s for 60s** (`src/geminiService.js:11-39`). Replace with SSE or WebSocket; or at minimum implement exponential backoff.

- **`VITE_API_URL` fallback to `http://localhost:5000`** in geminiService.js — fine for dev, but make sure prod build forces a real URL (fail loudly if missing).

- **i18n not enforced server-side beyond Gemini prompt.** Errors returned by routes are English-only.

- **`COOKIE_OPTIONS` duplicated** in `auth.js` and ad-hoc in `/logout` (`server/routes/auth.js:284-291`) — drift risk.

- **`var deletionCancelled`** in Google OAuth handler (`server/routes/auth.js:257`) — `var` only; bug-prone hoisting. Use `let` declared at top.

- **Razorpay plan logic is binary.** `if (planType === 'family')` in `server/routes/payment.js:40,83`. Move to a config map of plans → {amount, days, dbName} so prices/durations live in one place.

- **`subscription_expires_at` and `plan_expires_at` are two columns.** `analyze.js` checks `plan_expires_at`; `payment.js` writes `subscription_expires_at`. Likely inconsistent — verify and consolidate.

- **`scans_used` reset never happens at plan renewal.** `payment.js:87` resets `image_scans_used` only; `scans_used` keeps climbing. Quota effectively permanent for free users that ever upgraded.

- **`require` inside handlers** (`require('../utils/ownershipCheck')` inside scan routes) — minor, but move to top of file.

---

## Low-priority / polish

- Lots of `console.log` with unicode box characters in `scans.js` & `auth.js` (production noise).
- `home_screen.html` at repo root looks like a stray prototype — delete or move to `/docs`.
- `README.md` is 1 KB — no setup instructions, env var list, or architecture overview (despite having a separate `TECHNICAL_ARCHITECTURE.md`).
- `duckduckgo-images-api` in deps — used anywhere? Looks unused.
- `html-to-image` + `html2canvas` both installed; pick one.
- `@google/generative-ai` SDK in client deps but Gemini is now server-only — remove.
- No TypeScript despite `prisma.config.ts` and large surface area. Even gradual TS on the server would catch the auth/payment shape mismatches above.
- Magic numbers: 5 points reward, 10 bcrypt rounds, 30-day token, 7-day grace, 20-scan free limit — extract to a `constants.js`.
- `addPreCompletedJob` returns `status: 'completed'` immediately but client still polls — wasted RTT. Frontend can short-circuit when the POST response already has status=completed.

---

## Recommended next steps (in order)

1. **Lock down auth**: enforce `JWT_SECRET`, verify Google ID tokens, restore rate limiters.
2. **Fix cache-leak personalization bug** in `/api/analyze/text`.
3. **Make quota enforcement atomic** and applied to cache-hit path.
4. **Move profile picture out of `users.profile` JSONB** to Cloudinary URL.
5. **Pick one ORM** (Prisma) and adopt real migrations; remove `addColumnIfMissing`.
6. **Add server tests** (auth, payment signature verify, quota race) + CI.
7. **Decompose `App.jsx` / `Profile.jsx` / `Dashboard.jsx`** and add `react-router`.
8. **Structured logging + global error handler + graceful shutdown.**
