# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning where applicable.

## [Unreleased]
- 

## 2026-06-21
### Changed
- Updated `ARCHITECTURE.md` to reflect the RevenueCat migration: documented
  `/api/subscriptions/revenuecat` sync + webhook routes, the
  `RevenueCatContext`/`revenueCatService`/`Paywall` frontend wiring,
  `cordova-plugin-purchases@^8.0.7` (replacing the removed legacy
  `cordova-plugin-purchase@^13`), migration `011_add_revenuecat_fields.sql`
  (`subscription_expires_at`, `revenuecat_app_user_id`), new backend/frontend
  RevenueCat env vars, and demoted the direct Google Play Billing integration
  to legacy. Refreshed Cordova SDK levels (min 23 / target 35 / compile 35).
- RevenueCat (cordova-plugin-purchases v8) integration verified end-to-end against
  the installed plugin's actual API (window.Purchases clobber, configureWith,
  getOfferings/purchasePackage/restorePurchases/logIn/logOut/getCustomerInfo,
  onCustomerInfoUpdated event). Service/context/paywall/backend routes all match.
### Removed
- Removed conflicting legacy `cordova-plugin-purchase` (v13) from the Cordova app.
  It bundled a second Google Play Billing client and could not coexist with
  cordova-plugin-purchases (duplicate-class build failure). Removed from
  package.json, plugins/, and the android platform via `cordova plugin rm`.

## 2026-06-08
### Added
- Initial documentation set:
  - README.md
  - ROADMAP.md
  - CHANGELOG.md
  - docs/CONTEXT.md
  - docs/DESIGN.md
  - docs/UI_UX_DESIGN.md

<!-- imported from CHANGELOG.md by Agentry -->

## 2026-06-21 — Wired navbar "Upgrade" button to RevenueCat paywall
- File edited: `Frontend/src/components/Navbar.tsx`.
- Removed duplicated platform branch in old `handleUpgrade` (`isCordova ? openPaywall() : navigate('/subscription')`). Button now always calls `useRevenueCat().openPaywall()`; all platform branching stays in RevenueCatContext/Paywall.
- Destructured `{ openPaywall, isPremium, isReady }`. Button disabled + spinner ("Loading...") while `!isReady`.
- `showUpgradeButton` now `user?.role === 'admin' && (!isPremium || user?.is_trial)` (was `!is_subscription_active || is_trial`). Trial users still see CTA; premium non-trial users see no CTA (green active-subscription banner already covers them).
- Removed unused `useNavigate`/`navigate` and unused `User` icon import; added `Loader2`.
- FOLLOW-UP / FLAGGED: `PaywallContent.tsx` has NO web-specific copy. On web, offerings never load, so the modal shows the generic empty state "No subscription plans are available right now." instead of a "subscribe via the Android app" message. Needs product copy decision.

## 2026-06-21 (follow-up) — Added web-specific paywall copy
- File edited: `Frontend/src/components/PaywallContent.tsx`.
- Added an `isWeb` branch (after the `isPremium` block, before loading/offerings) that shows a "Subscribe in the Havenn app" message + a "Get the Android app" button linking to the Play Store (`com.havenn.studyspace`). Replaces the previous generic "No subscription plans available" empty state on web.
- Premium web users still see "You're Premium" first; no SDK calls added on web.

## 2026-06-25 — Created PROJECT_SETUP.md (full reproducibility guide)
- New file: `PROJECT_SETUP.md` at repo root. Goal: clone-and-recreate everything
  (backend, web, signed Android APK/AAB) with no questions.
- Inspected actual files (not assumptions): `Frontend/package.json`,
  `havenn/package.json`, `havenn/config.xml`, `havenn/build.json`,
  `havenn/gradle.properties`, `havenn/PLATFORM_ANDROID_CUSTOMIZATIONS.md`,
  `Backend/package.json`, both `.env.example`, `vite.config.ts`,
  `Frontend/src/utils/apiConfig.ts`, and the full `Frontend/src` tree.
- Key corrections vs the task's Expo/EAS/React-Native/Firebase template:
  - Real stack = Vite/React SPA + Express/PG backend + **Cordova** Android wrapper.
  - **No Expo, no eas.json, no app.json.** APK/AAB built via Cordova + Gradle.
  - **No Firebase** anywhere (verified). Documented as N/A; Cloudinary=images, Brevo=email.
  - RevenueCat (`cordova-plugin-purchases ^8.0.7`) primary; legacy direct Google Play in backend.
- Documented exact values: package `com.havenn.studyspace`, version 1.0.2,
  versionCode 10003, min23/target36/compile36, API base
  `https://havennapp.onrender.com/api`, build scripts from `havenn/package.json`,
  signing via `havenn/build.json` + `my-release-key.keystore` (alias myalias).
- FLAGGED security/consistency issues in the doc (Sections 5 & 14):
  - `Backend/.env.example` ships a real-looking RevenueCat key value and
    `havenn/build.json` contains a real keystore password — recommend rotating + removing from git.
  - Entitlement id mismatch: backend example `Havenn Library Pro` vs frontend `premium`;
    must be made identical.
  - config.xml/package.json say cordova-android 15 / compile 36, but
    PLATFORM_ANDROID_CUSTOMIZATIONS.md still references 13 / 35 — doc tells reader to trust committed config (36).


## 2026-06-27 — Backend unit tests for scans.js and analyze.js
- Created `Backend/routes/scans.test.js` (20 tests): auth, GET /, GET /database (with/without search + OpenFoodFacts mock), POST / (save scan, Cloudinary base64 upload), PATCH /:id/servings, GET /:id, DELETE /:id — all with ownership checks.
- Created `Backend/routes/analyze.test.js` (10 tests): POST /image (auth, validation, quota, success), POST /text (auth, success, cache hit via addPreCompletedJob, quota exceeded), GET /status/:jobId (success, 404).
- Updated `Backend/jest.config.js` to include `routes/scans.js` and `routes/analyze.js` in `collectCoverageFrom`.
- All 15 backend test suites (127 tests total) pass cleanly.
- Backend test coverage now includes all routes, middleware, and utils.


## 2026-07-20 — Added BMI display to the home dashboard
- Files edited: `Frontend/src/components/Dashboard.jsx`, `Frontend/src/i18n/locales/en/translation.json`.
- The "home" nav tab maps to `/dashboard` (`Dashboard.jsx`). Added a BMI card at the very bottom of the dashboard (after the "Explore" quick-nav section).
- BMI is computed from the already-stored user profile: `userProfile.height` (cm) and `userProfile.weight` (kg), passed into `<Dashboard>` from `App.jsx`. Formula: kg / (m^2), rounded to 1 decimal.
- New helpers `computeBmi(profile)` (defensive fallbacks: height_cm/heightCm, weight_kg/weightKg; returns null if missing/invalid) and `getBmiCategory(bmi)` (WHO ranges: <18.5 Underweight, <25 Normal, <30 Overweight, else Obese).
- New `BmiCard` component: shows value, colored category pill, height·weight subtitle, and a color-coded 15–40 BMI scale with a marker at the user's value. When height/weight are missing it shows a prompt with an "Update" button that navigates to the profile.
- Added i18n keys (en): bmi_title, bmi_missing, bmi_underweight/normal/overweight/obese, update_profile. Uses t() fallbacks so other locales still render English text.
- Verified: `npx eslint src/components/Dashboard.jsx` clean; `npm run build` succeeds; translation JSON validated.

## 2026-07-22 — Replaced orange/gradient UI with solid emerald theme
- Migrated the complete frontend brand system to `#10B981`, with solid hover `#059669`, pressed/dark accent `#047857`, light surfaces `#ECFDF5` / `#D1FAE5`, and green focus rings.
- Updated the central Tailwind v4/CSS token system plus legacy hardcoded colors across application shell, auth, dashboards, scan UI, navigation, paywalls, profile, history, comparison, results, charts, loading states, onboarding, quota, language selection, and feature status UI.
- Removed all CSS, Tailwind, inline-style, and SVG/chart gradients. Replaced the calorie ring and trend chart with solid green rendering and the BMI color ramp with four discrete solid semantic segments.
- Preserved semantic red error/destructive colors and normalized caution/warning uses to amber `#F59E0B` / `#B45309` instead of the former brand orange.
- Restricted Tailwind v4 source discovery to `Frontend/src` so stale `coverage/` and prior `dist/` files cannot reintroduce unused orange or gradient utilities into production CSS.
- Rebuilt `Frontend/dist` and regenerated the Cordova `havenn/www` bundle from it.
- Verification: production Vite build passes; 7 selected UI/theme-related Jest suites pass (45 tests); source + production + Cordova audit covered 77 files with 0 gradient matches and 0 legacy orange-brand matches.
- Existing project-wide quality-gate issues remain outside this theme change: the global ESLint configuration scans coverage/test files without the appropriate globals (588 errors), and the full Jest suite has ESM/Jest-global configuration failures in legacy service/API suites. The theme-specific score-color assertion was updated and passes.

## 2026-07-23 — Added complete PostgreSQL database creation script
- Added `Backend/database-schema.sql` as a consolidated fresh-database schema for all six tables referenced by the mounted backend: `users`, `scans`, `product_database`, `feature_requests`, `user_medical_conditions`, and `user_health_goals`.
- Included all columns added piecemeal by `Backend/server.js`, JSONB fields, foreign keys, uniqueness rules, the `pg_trgm` extension, and all application indexes.
- Included required route fields missing from the current startup initializer: `scans.image_url`, `feature_requests.status`, and `feature_requests.category`.
- The script is non-destructive (`CREATE ... IF NOT EXISTS`) and intended for a new/empty PostgreSQL database. It was reviewed against every SQL query in the backend; no database was modified while preparing it.

## 2026-07-23 — Diagnosed Render/Supabase startup ENOIDENTIFIER
- Render startup failure `(ENOIDENTIFIER) no tenant identifier provided` occurs at the first `pg` connection and is a Supabase Supavisor connection-routing error, not a missing-table/schema error.
- `Backend/server.js` currently constructs `pg.Pool` exclusively from `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, and `DB_NAME`; despite `PROJECT_SETUP.md`, it does not read `DATABASE_URL`.
- For Supabase's shared session pooler, Render must use the dashboard-provided pooler hostname, port `5432`, database `postgres`, and username `postgres.<PROJECT_REF>` (not plain `postgres` and not an IP address). No source code was changed during this diagnosis.

## 2026-07-23 — Fixed Render CORS and cross-site authentication cookies
- Added `Backend/config/cors.js` with an explicit credentialed origin allow-list. It always includes local Vite, Cordova's `https://localhost`, and `https://fitscore-6hqp.onrender.com`, accepts `FRONTEND_URL`, and supports comma-separated `FRONTEND_URLS` for additional deployments.
- Updated `Backend/server.js` to use the shared CORS configuration. The middleware now handles allowed OPTIONS preflights before auth routes and logs the active origin list at startup.
- Added `Backend/config/cookies.js`; production auth cookies now use `Secure` plus `SameSite=None` for the separate Render frontend/API sites, while local development uses `SameSite=Lax` without Secure. Logout uses matching attributes.
- Added focused CORS/cookie tests, including the exact deployed-origin `OPTIONS /auth/register` preflight. Verification passed: 3 suites and 36 tests (`config/cors.test.js`, `config/cookies.test.js`, `routes/auth.test.js`).
- Deployment still requires pushing these changes and redeploying the correct `fitscan-api` Render service. The frontend Static Site also needs the `/*` to `/index.html` rewrite for BrowserRouter routes such as `/onboarding`.

## 2026-07-26 — Fixed scan camera never starting (Home.jsx)
- File rewritten: `Frontend/src/components/Home.jsx`.
- ROOT CAUSE: chicken-and-egg render bug. `startCamera()` only set `hasCameraAccess = true`
  inside `if (videoRef.current)`, but the `<video ref={videoRef}>` element was rendered only
  when `hasCameraAccess` was already true. On first mount the ref was always null, so the
  acquired MediaStream was discarded and the UI stayed on the "camera unavailable" placeholder.
- Fix: `<video>` is now always mounted (opacity-toggled) and the stream is stored in state
  (`stream`), with a dedicated `useEffect` attaching `srcObject` + calling `play()` once both
  the element and stream exist. `hasCameraAccess` is derived as `!!stream`.
- Also fixed: (1) no Android CAMERA permission request before `getUserMedia` on the scan screen
  (startup request in `main.jsx` could be denied/not yet granted) — now calls
  `requestAndroidCameraPermission()` first; (2) constraint fallback chain
  (ideal environment + 1280x720 → facingMode environment → `video: true`) for devices that
  reject the strict constraints; (3) `startTokenRef` guard so StrictMode double-mount and rapid
  reset taps cannot leak or attach stale streams; (4) explicit error copy for insecure context
  (no `navigator.mediaDevices`), NotFoundError, NotReadableError; (5) "Use device camera"
  fallback button that opens the native camera via the file input `capture=environment`;
  (6) capture guards against zero-size video; (7) torch toggle no longer flips its UI state
  when `applyConstraints` fails; (8) file input value reset so the same image can be re-picked.
- Native config verified as already correct: `mobile/config.xml` declares
  `android.permission.CAMERA`, uses `scheme=https` / `hostname=localhost` (secure context),
  and `cordova-plugin-android-permissions@1.1.5` is installed; the generated AndroidManifest
  contains the CAMERA permission.
- Verification: `npx eslint src/components/Home.jsx` clean, `npm run build` succeeds.
  Frontend Jest: 11 suites pass; the 5 failing suites (`billingService`, `client`,
  `revenueCatService`, `geminiService`) are pre-existing ESM/jest-globals config failures
  unrelated to this change. `Home.jsx` has no test file.
- ENVIRONMENT NOTE: drive C: is at 0 GB free, which makes `str_replace` fail with ENOSPC
  (its temp path is on C:). `fs_write`/`fs_append` to D: work.

## 2026-07-26 — Cordova Android conversion: icons/splash, signing, on-device verification
Continued the existing Cordova conversion in `mobile/` (was already ~80% done and
uncommitted). Closed the two remaining gaps and verified the app on an emulator.

### Environment blocker hit first (root cause of a failed file write)
- `C:` had **exactly 0 bytes free** of 146 GB. An `fs_write` to `mobile/package.json`
  failed with `ENOSPC`, and the Android emulator refused to boot
  ("not enough disk space to run avd").
- Freed ~690 MB by clearing regenerable Chrome caches (`Cache`, `Code Cache`,
  `Service Worker/CacheStorage`, `GPUCache`).
- Moved the AVD off `C:` to free 4.89 GB: `Medium_Phone.avd` →
  `D:\android-avd\Medium_Phone.avd`, and rewrote
  `~/.android/avd/Medium_Phone_API_36.0.ini` (`path`/`path.rel`) to point there.
- All Gradle/Cordova builds were run with `GRADLE_USER_HOME=D:\gradle-home` and
  `TEMP`/`TMP`=`D:\build-tmp`. **`C:\Windows\SoftwareDistribution\Download` still
  holds 28.69 GB** — flagged to the user, not touched (system folder, needs elevation).

### Added — icons + splash (were completely missing)
- New `mobile/scripts/generate-resources.js` (+ `npm run gen:res`). Rasterises
  `Frontend/public/favicon.svg` via `sharp@0.34.4` (added as a pinned mobile
  devDependency; no ImageMagick/PIL on this machine) into `mobile/res/`:
  6 legacy launcher icons, 6 adaptive foreground **and** 6 adaptive background
  PNGs, a 1152px Android-12 splash icon, and a 512px Play Store icon.
- `config.xml`: added the 6 `<icon>` entries plus
  `AndroidWindowSplashScreenBackground=#F5F5F5` and
  `AndroidWindowSplashScreenAnimatedIcon`.
- **GOTCHA (build failure, fixed):** setting `background="#F5F5F5"` on `<icon>`
  fails `processDebugResources` with
  `resource mipmap/ic_launcher_background not found`. cordova-android always emits
  `<background android:drawable="@mipmap/ic_launcher_background" />`, so the
  background MUST be an image path, not a colour literal. Hence the generated
  flat background PNG per density.
- `mobile/.gitignore`: added `res/` (generated output).
- Verified inside the APK: all 6 densities of `ic_launcher.png`,
  `ic_launcher_foreground/background.png`, `ic_launcher.xml`, splash resources.

### Added — release signing
- Generated `mobile/nutriscan-release.keystore` (alias `nutriscan`, RSA 2048,
  10000 days) and `mobile/build.json`. Both confirmed git-ignored.
- **Password is the placeholder `changeit-nutriscan`** — must be replaced/rotated
  before any real Play upload. Flagged to the user.

### Artifacts (both rebuilt clean end-to-end)
- Debug APK 4.76 MB, signed release AAB 3.79 MB (`npm run build:aab`).
- AAB signature verified: `CN=NutriScan`, valid to Dec 2053.

### On-device verification (emulator Medium_Phone_API_36.0, WebView 133)
Wrote three CDP-based scripts (no Playwright in repo; hand-rolled a minimal
RFC6455 client) that attach to the live WebView:
- `mobile/scripts/verify-device.js` — 7/9 pass: cordova bridge 15.1.0, permissions
  plugin, `https://localhost` origin, secure context, HashRouter, camera visible,
  React mounted (323 DOM nodes).
- `mobile/scripts/verify-camera.js` — **5/5 pass**: back camera live
  ("camera2 0, facing back"), 720x1280, frames decoded, real 20 KB JPEG data URL
  captured. The core scan path genuinely works on-device.
- `mobile/scripts/verify-api-in-webview.js` — real register→Bearer round trip.
  localStorage persistence passes.

### KNOWN ISSUE / NOT A CODE BUG — deployed API is stale
The only failing checks are the 2 API ones, and the cause is the deployment, not
the app:
- WebView console: CORS preflight to `https://fitscan-api.onrender.com` returns
  **no `Access-Control-Allow-Origin`**.
- The deployed API returns **404 for every route** (`/auth/login`, `/auth/me`,
  `/scans`, `/features`) with an **empty body**, while local returns
  `{"error":"Route not found: ..."}`. Note routes mount at `/auth`, `/scans`,
  `/features` — NOT `/api/auth`.
- Proven correct locally: started `Backend/server.js` and got
  `ACAO: https://localhost` + clean 401. A temporary 8-check script passed **8/8**:
  mobile register/login return the JWT, Bearer authenticates `/auth/me` and
  `/scans` with no cookie, anon → 401, and **web login does NOT leak the JWT in
  the body** while still setting the HttpOnly cookie. Temp scripts deleted.
- `Backend` jest: `config/cors.test.js` + `middleware/auth.test.js` → 13/13 pass.
- **ACTION REQUIRED: redeploy the backend** (the CORS/Bearer changes are still
  uncommitted in the working tree). Then re-run `verify-device.js` → expect 9/9.

### Also noted
- WebView correctly blocks cleartext, so an `http://localhost:5000` backend can't
  be reached from the `https://localhost` page (mixed content). Use https/a tunnel.
- Brand mismatch: `favicon.svg` is purple `#863bff` but `--ns-primary` is emerald
  `#10B981`. Icons were generated from the favicon; asked the user to confirm.
- `mobile/README.md` updated with the icon/splash workflow, the mipmap gotcha, and
  the on-device verification instructions.

## 2026-07-27 — Added subtle button borders and rebuilt calendar date controls
- Updated the shared button rule in `Frontend/src/tailwind.css`: every `<button>` now receives a consistent 1px solid border through reusable `--ns-button-border`, `--button-border-color`, and `--button-border-width` tokens. Light mode uses a subtle dark slate border and dark mode uses a darker black border; component-specific visual states can override the color/width through the custom properties without changing layout.
- Reworked the active dashboard `WeekSelector` in `Frontend/src/components/Dashboard.jsx`: moved previous/next week controls into the header so the seven dates receive the full card width, increased the date number size, increased cell height, and changed the selected date from a solid green fill/shadow to a transparent square-rounded cell with a 2px green outline.
- Applied the same outlined, no-fill date treatment to the alternate `Frontend/src/components/DashboardRedesign.jsx` calendar so it remains consistent if that view is activated later.
- Added responsive calendar rules for narrow screens: date cells retain clear 14px corner rounding, header controls wrap below 380px, and the scan count/arrow controls avoid squeezing the date grid.
- Verification: targeted ESLint passes for both dashboard files; `npm run build` succeeds; compiled production CSS contains the shared button-border and selected-calendar rules; `git diff --check` passes for the three edited frontend source files. Vite still reports the existing non-blocking >500 kB chunk-size warning.

## 2026-07-27 — Premium UI polish pass (tokens, edge system, states)
- New docs in `Frontend/`: `DESIGN_TOKENS.md` (spec), `UI_POLISH_INVENTORY.md` (inventory +
  builder lanes + duplicate-functionality decisions), `UI_POLISH_CHANGELOG.md` (what changed).
- New scripts: `Frontend/scripts/normalize-tokens.mjs` (lane-scoped radius/border migration,
  dry-run by default) and `Frontend/scripts/review-tokens.mjs` (Phase 4 reviewer, 12 checks,
  exits 1 on regression — worth wiring into CI).
- ROOT CAUSE of the "missing borders" complaint: `--ns-button-border` was `rgba(0,0,0,0.68)`
  in dark mode, i.e. a black border on `#111`. A global `button` rule at tailwind.css:1488
  force-applies that border to all 117 buttons, so every button was edgeless in dark mode.
- SECOND independent cause: 6 arbitrary Tailwind values contained a space
  (`shadow-[0_6px_18px_rgba(16, 185, 129,0.4)]`), which cannot compile and emitted no CSS.
  This is why the bottom-nav FAB had no shadow and the active tab no tint. Watch for this
  pattern; it is silent.
- Added token layer to `tailwind.css`: `--edge-hairline`, `--elev-rest|raised|floating|pressed|accent`
  (separate dark values using inset highlights, since black shadows vanish on dark), radius
  scale wired into Tailwind v4 `@theme` so `rounded-*` resolves to it, `--dur-*`/`--ease-*`
  motion tokens, plus utilities `.edge-hairline/.edge-highlight/.edge-bold`, `.elev-*`,
  `.num-tabular`, `.tap-44`, `.btn-spinner`, and a global `:focus-visible`.
- 169 off-scale radii and 49 `1.5px` borders migrated; 9 different selected-state mechanisms
  collapsed into the bold-outline pattern the calendar day cell already used.
- Files edited: `Dashboard.jsx`, `Home.jsx`, `MobileBottomNav.jsx`, `Login.jsx`, `SignUp.jsx`,
  `PaywallModal.jsx`, `Compare.jsx`, `tailwind.css`.
- EXCLUDED `DashboardRedesign.jsx`: unrouted mockup with its own `--fs-*` theme and its own
  font imports (Plus Jakarta Sans/Inter). Candidate for deletion.
- Frontend tests: 11 suites pass, 5 fail. The 5 are PRE-EXISTING ESM/Jest-globals config
  errors (`jest is not defined` / `require is not defined`) in platformUtils, revenueCatService,
  billingService, geminiService, client tests. Unrelated to UI work; `jest.config.js` needs
  `injectGlobals` handling or those files need `import {jest} from '@jest/globals'`.
- NOT VERIFIED: visual light/dark check in a browser (Playwright bridge would not connect).
  Modes were verified by reading compiled per-mode token values only.

## 2026-07-27 — UI polish pass, round 3 (brief section 0.7)

Rounds 1 and 2 were already shipped (see `Frontend/UI_POLISH_CHANGELOG.md`).
Round 3 covers the reference-dashboard patterns in brief section 0.7.

Files added: `Frontend/src/utils/macroMeta.js` (macro category map),
`Frontend/src/components/ProgressRing.jsx` (shared radial arc),
`Frontend/src/components/EmptyPreview.jsx` (skeleton-preview empty state).

Files edited: `tailwind.css` (added `--sem-macro-*` in both modes, `.graph-heading-row`,
fixed `1.5px` calendar ring regression, removed the duplicate ring rotation and the
fixed `result-score-ring` size), `DailyNutritionCard.jsx`, `ScanCard.jsx`,
`Results.jsx`, `Dashboard.jsx`, `History.jsx`, `Trends.jsx`, `utils/nutrition.js`
(dropped the emoji `icon` field), `scripts/review-tokens.mjs` (17 → 25 checks).

Key decisions:
- Carbs accent is a warm tan `#D9BE8C` in dark mode, NOT the reference's `#FBBF24`,
  because that value is exactly `--sem-score-avg` — a carbs badge and a "caution"
  score would have been the same colour. Reviewer check 20 enforces this.
- ProgressRing applies only where a number has a real ceiling (calories vs. goal,
  scores /10). Not on scan counts or streaks — no natural maximum.
- Search-with-no-matches empty states left as text on purpose; a preview card
  would imply results exist.

FLAGGED, needs a decision: `ScanQuotaBar.jsx` is unrouted (no importer) and built
entirely from raw Tailwind palette classes with its own duplicate three-band colour
logic. Left untouched. Keep-or-delete decision needed; if kept it needs its own pass.

Verification: `npm run build` and `npm run build:cordova` pass; reviewer gate
25/25; `verify-modes.mjs` reports zero drift; tests 11 pass / 5 fail, the same
pre-existing ESM/Jest-globals failures as before. Not visually verified in a browser.

## 2026-07-28 — UI polish round 3b: Profile page + all app icons

Extends round 3's category-accent rule to the Profile screen and every icon in the app.

Tokens added (`tailwind.css`, both modes): `--sem-area-account` / `-health` /
`-support` / `-premium` (settings-row groups) and `--sem-streak` (engagement).
Assigned per functional GROUP, not per row — 11 rows in 11 colours would be a paint
chart. Danger rows keep `--ns-error` regardless of group.

Files edited: `Profile.jsx` (area props, Lock for privacy vs ShieldCheck for terms,
Sun/Moon state mirror), `Dashboard.jsx` (streak flame + Explore tile accents),
`tailwind.css` (badge single-accent derivation, `data-area` mapping, stat-card and
sheet-product hexes → semantic tokens, `.profile-avatar` 3px → 2px), plus icon-size
snaps in 13 components. `scripts/review-tokens.mjs` 25 → 31 checks.
`scripts/verify-modes.mjs` extended with the 10 new tokens.

Real bugs found unprompted: `.delete-success-icon-wrap` was an emerald tint behind
amber text inside an amber border (success dialog rendering as a warning);
`.stat-card-icon` used raw pre-round-2 hexes so DARK MODE WAS SHOWING LIGHT VALUES;
`.stat-card-icon.trend` is dead code from round 2.

Icon sizes: 19 distinct → 8 (14/16/18/20/22/26/32/48). Added 48 as a real step for
the single full-screen hero. 31 usages snapped. Reviewer enforces the list.

STILL FLAGGED, needs decisions: (1) `ScanQuotaBar.jsx` unrouted + off-system;
(2) dead legacy CSS (`.nutrient-chip-*`, `.fitscan-*`, `.plan-badge`,
`.stat-card-icon.trend`) holds stale values — reported as a reviewer NOTE, not
edited, since deleting is wider than a styling pass should decide.

ENVIRONMENT WARNING: the C: drive is at 0 bytes free, which causes ENOSPC failures
in jest and in file writes. Jest needs `--cacheDirectory` pointed at D: to run.

Verification: both builds pass, gate 31/31, zero mode drift, lint clean of new
errors, tests at the 11/5 baseline. Not visually verified — Playwright bridge
would not connect.

## 2026-07-28 — UI polish round 4: Login, SignUp, Onboarding (+ reviewer blind spot)

Brought the last three off-system screens onto the design system. These were the
first screens a new user sees and the worst in the app.

MEASURED BEFORE: Onboarding had 46 inline `style={{}}` objects, 66 raw hexes, 22
`!important`, a component-local `<style>` block, and zero dark-mode support.
Login/SignUp hardcoded `#F5F5F5` / `#1A1A1A` / `#EBEBEB` (13 and 21 raw hexes).
All three now measure 0 raw hexes, 0 inline styles, 0 `!important`, no local
stylesheet.

ROOT CAUSE of why this survived three prior passes: every reviewer check reads
`className` strings or `tailwind.css`, so inline style objects and template-literal
stylesheets are invisible to it. Replayed the old onboarding against the existing
checks — 4 of 5 missed it. The gate reported 31/31 while these screens honoured
none of the system. Onboarding also used Material green (`#4CAF50`/`#43A047`), not
the brand emerald, on the screen that introduces the brand.

Added to `tailwind.css`: `.auth-*` shell (brand panel, form panel, inputs, reveal
button, submit, links, error) and `.ob-*` onboarding layer (stepper, wheel, ruler,
choice list, unit toggle, date card, manual entry), both with dark-mode colour-only
overrides.

Three new reviewer checks (25 → 34 total), each written to catch the class of bug
that hid here rather than the instance:
- inline styles that hardcode a **colour literal**. Narrowed twice: a literal
  *length* (`3px solid var(--token)`) still follows the mode, and computed accents
  / `clamp()` / `var()` refs are how the semantic map is threaded through JS by
  design (TOKENS 14.1). Flagging those would have been 56 false positives.
- component-local `<style>` blocks.
- mojibake (mis-decoded UTF-8).

REAL BUGS FOUND UNPROMPTED:
- Gender options were emoji **corrupted on disk** (rendered as literal `ðŸ‘©`).
  The existing emoji check could not see them: the corrupted bytes no longer match
  an emoji range. Replaced with lucide Venus/Mars/Transgender.
- `Profile.jsx` language picker: 6 of 8 labels were mojibake (`FranÃ§ais`,
  `Ø¹Ø±Ø¨ÙŠ`). `LanguageSwitcher.jsx` held the same list correctly encoded — a
  duplicated list where one copy rotted. Extracted to `src/utils/languages.js` as
  one source of truth; both files now import it. A latin1→utf8 round-trip repair
  was attempted first and **reverted**: it fixed the French/Spanish but mangled
  Hindi (`हिन्द६`) and double-encoded the Arabic/Urdu/Nepali.
- `LoadingState.jsx`: `background: '#ffffff'` stayed white in dark mode (white chip
  on `#111`); `#5BAD4E` was the retired pre-round-2 score green (~2.4:1 on white).
  Both tokenised, plus a `1.5px` border → 1px.

MISTAKE MADE AND CORRECTED: an early `git checkout -- Profile.jsx` discarded
uncommitted round-3b work (the `data-area` props and icon-size snapping) whose CSS
half was already in `tailwind.css`. Not recoverable from git — no dangling blob had
it. Reapplied: 10 rows + theme toggle grouped account/health/support/premium with
danger overriding its group, and 9 off-scale icon sizes snapped. I initially and
wrongly blamed a `git stash` round trip for this; the stash was innocent.
LESSON: do not use `git checkout --` / `git stash` on this tree to test a baseline
— most of rounds 1-3 is still uncommitted.

VERIFICATION: reviewer 34/34; `verify-modes.mjs` zero drift; `npm run build`
passes; 20/20 new rules confirmed in the compiled CSS with dark overrides; full
suite **16 suites / 160 tests all passing** (the 5 pre-existing ESM/Jest-globals
failures noted in earlier rounds are now green). Three Login tests needed their
`/password/i` query anchored to `/^password$/i` because the reveal button now
carries an accessible name — same form `SignUp.test.jsx` already used.
NOT VERIFIED: no browser/visual check; modes confirmed by reading compiled
per-mode token values only.

FLAGGED, NOT CHANGED:
- Product name is split: `index.html` and 9 usages say "NutriScore", Login/SignUp
  say "FitScan". Copy is out of scope for a styling pass, so onboarding was left on
  "NutriScore" rather than deciding it silently. Needs a product call.
- `Profile.jsx` has 3 pre-existing `authToken` unused-var ESLint errors (confirmed
  present at HEAD).
- `ScanQuotaBar.jsx` still unrouted + off-system (open since round 3).
- C: drive at ~0 bytes free causes ENOSPC in jest and file writes; jest needs
  `--cacheDirectory=D:\jest-cache`.

## 2026-07-28 — Bug-fix batch (13 reported issues)
Implemented across backend + frontend. All 162 backend tests pass; frontend
touched-suites (Login, SignUp, LoadingState) pass. 5 frontend suites remain
failing on a PRE-EXISTING Node v22 / experimental-vm-modules ESM limitation
(revenueCatService, platformUtils, client, billingService, geminiService) —
verified failing on the clean baseline via git stash, unrelated to this work.

- **404 on refresh**: added `Frontend/public/_redirects` (`/* /index.html 200`)
  so the Render/Netlify static host serves the SPA for deep links. Copied to
  `dist/` by Vite at build.
- **Scan counter stuck 0/20**: `/auth/me`, `/login`, `/register`, `/google` now
  return `scansUsed`/`scanLimit`/`scansRemaining` via new
  `Backend/utils/scanQuota.js` (single source of truth, free limit = 5). App.jsx
  fallback 20→5. `routes/user.js` refactored to use `buildQuota`.
- **Duplicate emails**: emails normalised to lowercase; `findUserByEmail` uses
  `LOWER(email)`; register returns 409 + handles 23505; server.js migration
  lowercases existing rows and adds a `LOWER(email)` unique index (skips if
  case-collisions already exist, logs them).
- **Forgot password**: new `POST /auth/forgot-password` + `POST /auth/reset-password`
  (sha256 token hash, 30-min TTL, generic response to prevent enumeration),
  `Backend/utils/mailer.js` (Brevo HTTP API, logs when BREVO_API_KEY unset).
  Frontend: `ForgotPasswordModal.jsx`, `ResetPassword.jsx` + `/reset-password`
  route. Login "Forgot password?" button now wired.
- **Medicine/tablet rejection**: both Gemini prompts classify food vs non-food
  first (`isFood`/`rejectionReason`); `assertFoodResult` throws with `NON_FOOD::`
  marker BEFORE quota increment; barcode/text path has keyword pre-flight
  (`detectNonFoodProduct`) returning 422. Frontend geminiService detects marker
  + 422 and surfaces a friendly message.
- **Eaten / Not eaten + Health Progress**: new `scans.eaten`/`eaten_at` columns,
  `PATCH /scans/:id/eaten`. History.jsx has Eaten/Not-eaten toggle + delete
  (with confirm). Trends.jsx only counts `eaten === true`.
- **Delete scan history**: delete button + confirm in History.jsx (backend
  `DELETE /scans/:id` already existed).
- **Weight default 62**: Onboarding no longer hardcodes 62; starts at neutral 70
  with `weightTouched` gate — cannot advance step 3 until user moves it; internal
  fields stripped before save.
- **DOB 13+ validation**: `Backend/utils/ageCheck.js` (shared), enforced in
  profileValidator (covers /profile + /details) and register; Onboarding blocks
  under-13 client-side (date max + step-5 gate).
- **Google Sign-In**: `GoogleOAuthProvider` in main.jsx (VITE_GOOGLE_CLIENT_ID);
  `GoogleSignInButton.jsx` (lazy-loads `GoogleButtonInner.jsx` so ESM pkg stays
  out of the graph/tests when no key). Backend `/auth/google` now VERIFIES the
  Google access token via userinfo endpoint (was trusting client-supplied email);
  links google_id to existing email accounts. Dev fallback only when no
  GOOGLE_CLIENT_ID and not production.
- **Image Analyzing screen redesign**: LoadingState.jsx rebuilt — single rotating
  focal ring + one progress track + compact step list (was hero tile + blobs +
  per-row bars).
- New backend tests: `utils/ageCheck.test.js`, `utils/scanQuota.test.js`; updated
  auth.test.js (409, password min, age gate, google linking) and user.test.js
  (isPremium field).
- Env: added VITE_GOOGLE_CLIENT_ID (Frontend/.env.example) and
  BREVO_API_KEY/MAIL_FROM_*/APP_URL (Backend/.env).

## 2026-07-28 — Production security hardening (Phases 1–8)

Implemented an end-to-end security pass and added `SECURITY_HARDENING.md` with
affected files, exact controls, deployment-sensitive changes, per-phase test
commands, remaining audit findings, and production environment requirements.

- Auth/session: 15-minute issuer/audience-bound JWTs, hashed rotating 30-day
  refresh tokens with family replay revocation, HttpOnly/Secure/SameSite browser
  cookies, Cordova Bearer sessions in Android Keystore-backed secure storage,
  bcrypt cost 12, strong new/reset password policy, exponential login lockout,
  session revocation on reset/delete, and route ownership checks. Existing
  unversioned JWTs are accepted only through their original expiry.
- Abuse/validation: global and endpoint-specific IP rate limits, auth/API
  slowdown, per-user AI limits, strict reusable Zod schemas and bounded uploads,
  plain-text sanitization, authenticated/owner-scoped analysis job status, and
  cryptographically random job IDs. Runtime DB access is raw `pg` (not Prisma),
  uses positional parameters, and has no `$queryRawUnsafe`.
- HTTP/browser: Helmet strict API CSP, production HSTS/HTTPS enforcement,
  disabled X-Powered-By, explicit credentialed CORS allowlist, double-submit
  CSRF for cookie-authenticated writes, request IDs and bounded request bodies.
- Payments/webhooks: Razorpay order ownership/amount binding and idempotency;
  Google RTDN OIDC identity, bounded base64/event/product validation and event
  idempotency; RevenueCat exact bearer + raw-body HMAC/timestamp/replay check,
  app allowlist and server-side entitlement refresh. Added `payment_orders`,
  `webhook_events`, `refresh_tokens`, and user lockout/token-version schema.
- Secrets/mobile/monitoring: safe `Backend/.env.example`; redacted structured
  security logger; removed reset-token/PII logging; Android cleartext/backup
  disabled, explicit Cordova allowlists, HTTPS local shell, secure-storage and
  RevenueCat plugins, R8/minify/resource shrinking. Play Integrity/root-tamper
  attestation remains an external Play Console/Google Cloud integration and is
  explicitly not claimed complete.
- Removed unused Prisma packages and `duckduckgo-images-api`; applied non-forced
  dependency updates. Production audits: backend 7 moderate nodes in the
  `googleapis`/`uuid` tree (no complete current fix), frontend 2 high React
  Router RSC-action nodes (Vite SPA does not use RSC; no current audit fix),
  mobile 0.

Verification: backend **21 suites / 171 tests**, frontend **16 suites / 160
tests**, Vite production build, and Cordova prepare all pass. Generated Android
manifest confirms cleartext=false, backup=false, and network-security config.
Native release compilation is blocked locally because the configured
`ANDROID_HOME` SDK directory does not exist; source preparation itself passes.

## 2026-07-28 — Removed onboarding DOB step; 13+ enforced on the age wheel
- `Frontend/src/components/Onboarding.jsx`: deleted `DateOfBirthPicker`,
  `calculateAge`, `maxDobString`, the step-5 DOB question/render branch and the
  `dateOfBirth` profile field. `TOTAL_STEPS` 7 → 6; Medical = step 5, Health
  Goals = step 6 (chrome gate now `step <= 4`, `handleMedicalSaved` → `setStep(6)`).
- Age gate moved onto the wheel: `AgePicker` list is now 13-100
  (`MINIMUM_AGE`..`MAXIMUM_AGE`) instead of 10-89, so an under-13 value is not
  selectable. Initial age is `clampAge()`d, and `handleNext` still re-checks
  `age >= 13` on step 1 as defence in depth.
- Signup payload to `PUT /auth/details` now sends `age` instead of `dateOfBirth`.
- `Backend/middleware/profileValidator.js`: added `age` to the strict
  `profileSchema` (int or numeric string, 13-100, with the 13+ message). Needed
  because the schema is `.strict()` and would otherwise 400 on the new field.
  `dateOfBirth` + `isOldEnough` kept for existing/legacy profiles and register.
- `Frontend/src/components/Profile.jsx`: Personal Details field `dateOfBirth` →
  `age` (number input, min 13 / max 100, client-side range check before save);
  dropped the DOB date formatting branch.
- `Frontend/src/tailwind.css`: removed the now-dead `.ob-date-card` / `.ob-hint`
  block and the dark-mode calendar-indicator invert.
- Verified: `npm run build` (Frontend) clean; backend
  profileValidator + auth + ageCheck suites pass (50 tests).

## 2026-07-28 — Removed the theme toggle button from the dashboard header
- `Frontend/src/components/Dashboard.jsx`: dropped the `<ThemeToggle>` render in
  the greeting header, its `./ThemeToggle` import, and the now-unused
  `isDark`/`themeMode`/`toggleTheme` props from the component signature.
- `Frontend/src/App.jsx`: stopped passing those three props to `<Dashboard>`.
  `useTheme()` in App is still needed — Profile consumes the same props.
- `ThemeToggle.jsx` + its test are left in place (still exports `useTheme`,
  which App and the theme bootstrap rely on). Theme switching remains reachable
  via the Profile → Dark mode row.
- Verified: `npm run build` clean.

## 2026-07-29 — Fixed mobile 403 "Invalid CSRF token" on register/login
- Symptom (Cordova APK, `https://localhost` WebView -> `https://fitscore-rqgb.onrender.com`):
  `/auth/register` and `/auth/refresh` returned 403 `Invalid CSRF token`; `/auth/me` 401.
- Root cause: `Backend/server.js` applies `csrfProtection` globally. It only exempted
  requests carrying `Authorization: Bearer`. Pre-auth mobile writes have no token yet, and the
  WebView drops the API's cross-site `SameSite=None` `fitscore_csrf` cookie, so the
  double-submit pair could never match — every mobile sign-in/sign-up was rejected.
- Fix in `Backend/middleware/csrf.js`: added `isMobileClient` (`X-Client: mobile`) +
  `hasSessionCookie` (`token`/`refresh_token`); `csrfProtection` now also skips when the request
  is a mobile client AND carries no session cookie. Safe because `X-Client` is a non-simple
  header (needs a passing CORS preflight, which an attacker origin fails), and the exemption is
  voided the moment a session cookie is present, so cookie-authenticated writes still need the token.
- `isMobileClient` is now exported from `middleware/csrf.js`; `routes/auth.js` imports it instead
  of defining its own duplicate copy.
- Tests: 3 new cases in `Backend/middleware/csrf.test.js` (mobile pre-auth allowed; X-Client +
  session cookie still 403; cookie-less browser write without the hint still 403).
  Full backend suite: 21 suites / 174 tests pass.
- Live verification (local `node server.js`): `POST /auth/login` with `X-Client: mobile` -> 401
  `invalid_credentials` (reaches the route); same request without the header -> 403 `csrf_rejected`.
- Mobile side needed NO change. `mobile/www` was re-synced from a fresh
  `npm run build:cordova` (bundle `index-BxOU1q5M.js`); APK/AAB build not run to completion.
- OUTSTANDING: the fix only takes effect for the installed APK after the backend on
  fitscore-rqgb.onrender.com is redeployed.
