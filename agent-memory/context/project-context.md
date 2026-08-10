# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning where applicable.

## [Unreleased]
### Fixed
- Privacy policy URL `https://fitscore-6hqp.onrender.com/privacy-policy` was
  returning an empty SPA shell (just `<div id="root"></div>`) because Google Play
  Console's crawler does not execute JavaScript, so it read an empty page and
  reported "Privacy policy page returns a page not found error".
  - Added `Frontend/public/privacy-policy.html`: a self-contained static page
    with the full policy content baked in (17 sections, brand-styled inline CSS,
    no external font/JS requests, proper `<title>`, description, canonical,
    OpenGraph and Twitter meta tags). Vite copies it as-is to `dist/`.
  - Added explicit rewrite rules in `render.yaml` (BEFORE the SPA fallback):
    `/privacy-policy` and `/privacy` -> `/privacy-policy.html`.
  - Same rules added to `Frontend/public/_redirects` for portability if the
    static host is ever swapped to Netlify/Cloudflare Pages.
  - The React `<PrivacyPolicy />` page, the `/privacy` -> `/privacy-policy`
    SPA redirect, and all related tests are unchanged.

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

## 2026-07-29 — Health Progress (Trends) spacing pass
- Single file changed: `Frontend/src/tailwind.css` (new block appended at end). No JSX touched, so no logic/state/props/data-fetching changes.
- IMPORTANT correction to the task's premise: this screen is **not** a Tailwind-utility TSX component. `Frontend/src/components/Trends.jsx` uses semantic CSS classes (`.trends-*`, `.stat-card-*`, `.graph-*`) and all spacing lives in `tailwind.css` (~11.2k lines). Tailwind v3 is present but the screen's layout is hand-written CSS, so the fix is CSS custom properties + declarations, not `className` edits. Same for the bottom nav (`MobileBottomNav.jsx` -> `.ns-bnav-*`).
- Introduced one scale on `.trends-page`: `--trends-gap: 12px`, `--trends-card-pad: 16px`, `--trends-section: 16px` (16px = what `--page-pad-x/y` already collapse to at <=430px).
- Fixes: header bottom margin 14px->16px; `.trends-content` gap ->16px; stat grid gap from shared var both axes + `align-items: stretch`; `.stat-card-icon { flex: 0 0 auto }` (badge was being squeezed by long labels); `.stat-card-info span` gets `min-height: 2.6em` so BEST/WORST DAY rows align; `.trends-graph-container` padding `20px 16px`->16px; `.range-tabs button` -> `box-sizing: border-box; flex: 1 1 0; min-height: 40px; padding: 0 12px` (root cause of the fat selected pill was the shared `border: 2px !important` active rule at ~8685, not padding); `.graph-header`/`.graph-score` allowed to wrap so "/ 10" stays inline and the legend + trend chip stop hugging the right edge; `.graph-legend` spacing moved to `margin-left` on dots so each dot groups with its own label; `.ns-bnav` gap floor 8px->12px and side padding 12px->16px to clear the FAB's 3px shadow ring.
- Scoping notes for future edits: the Trends screen has base rules ~5108, an `!important` normalisation block ~8259, and TWO `min-width: 1024px` layout blocks (~6669 and ~7269) that build the desktop two-column grid. New spacing rules that must not disturb desktop are wrapped in `@media (max-width: 1023px)`. Anything beating the ~8259 block needs `!important` AND a later source position — hence appending at EOF.
- FLAGGED, not fixed (needs a product decision): "Health Progress" genuinely renders twice. `App.jsx` mobile `top-header` prints `t(shellTitles.trends)` and `Trends.jsx` prints its own `<h1>{t('health_progress')}</h1>`. Collapsing them = deleting one heading = a JSX/structure change, which was out of scope. The in-page bar also carries the back button + filter icon, so it cannot just be dropped. Affects every shell page, not only Trends.
- Verified: `npm run build` in `Frontend/` passes (CSS 235.03 kB). `npx vitest --run` HANGS (>10 min, pre-existing — unrelated to this change); no test file references any class touched here.

## 2026-07-29 — Profile "Upgrade" paywall: 4 pricing tiers + two payment bugs fixed
- Added 7 Days ₹50, Monthly ₹499, Yearly ₹400/mo (₹4800 billed yearly), Lifetime ₹15000 to the Profile > Upgrade modal (`modal === 'family'`). Previously a single hardcoded "₹249 / month" card.
- NEW `Backend/config/plans.js` — single source of truth for plan id, amount (paise), durationDays. Prices live server-side ONLY; the client sends just `planId`. `durationDays: null` = lifetime (existing expiry guards in `requirePlan.js` / `analyze.js` are `plan_expires_at && <past>`, so NULL correctly means never expires).
- NEW `GET /api/payment/plans` (authenticated) returns the catalogue. The `trial7` tier is filtered out server-side if the account has any `payment_orders` row with `status='paid'` (`firstPurchaseOnly`), and `create-order` re-checks it → 409. Hiding the button is not enforcement.
- **BUG 1 FIXED (paywall was completely broken):** `Profile.jsx` sent `{ planType }` to `/create-order`, but that route used `validateRequest({ body: emptyBody })` where `emptyBody = z.object({}).strict()`. Strict rejects unknown keys, so every upgrade attempt got a 400 and checkout never opened. Verified with a direct zod repro. Same bug on `/verify` (also sent `planType` into a `.strict()` schema). Now: `/create-order` validates `payments.createOrder = { planId: z.enum(PLAN_IDS) }`; `/verify` receives no plan at all.
- **BUG 2 FIXED (paid users still hit the free cap):** `/verify` only set `subscription_plan` + `subscription_expires_at`, but the scan quota (`analyze.js checkQuota`) and `requirePlan.js` read `plan`, `plan_expires_at`, `scan_limit`. A paying user stayed capped at FREE_SCAN_LIMIT=5. `/verify` now writes both column pairs plus `scan_limit = PREMIUM_SCAN_LIMIT (100000)` and resets `scans_used`/`image_scans_used`.
- `/verify` no longer hardcodes 30 days — duration comes from `payment_orders.plan_id` recorded at order creation, so paying for 7 days cannot be redeemed as lifetime. NULL `plan_id` (legacy rows) falls back to monthly.
- DB: added `payment_orders.plan_id VARCHAR(50)` in BOTH `server.js` (CREATE TABLE + `addColumnIfMissing` for existing deployments) and `database-schema.sql`.
- Frontend: plans fetched on modal open (not mount) because the response is account-dependent; `PLAN_COPY`/`PLAN_ORDER`/`PLAN_FEATURES` hold display copy only, no prices. Yearly's "₹400 × 12 = ₹4800" note is derived from the server amount so it can't drift. Added `.plan-subtitle`, `.plan-price-usd`, `.plan-note`, `.profile-plans-status` CSS + `flex-wrap` on `.profile-plans-container` (4 cards don't fit one row).
- Verified: backend 21 suites / 184 tests pass (payment.test.js grew 7→17, covering per-plan pricing, tamper rejection, lifetime NULL expiry, legacy fallback, intro-tier reuse). Frontend `npm run build` passes. No diagnostics.
- NOT DONE / FLAGGED: Razorpay is web-only. The Cordova Android build uses RevenueCat (`PaywallContent.jsx` + `RevenueCatContext`), which reads its own products from the RevenueCat dashboard and knows nothing about `config/plans.js`. These 4 tiers must be recreated as RevenueCat products/offerings for the Android app, or in-app prices will not match the web ones. Also unresolved from earlier: entitlement id mismatch (`Havenn Library Pro` vs `premium`).

## 2026-07-30 — Changed Android package name and produced signed AAB for Play Store
- Package name changed `com.nutriscan.app` -> `com.nutriscore.app` (matches the
  `NutriScore` widget name already in config.xml).
- Files edited:
  - `mobile/config.xml` — `<widget id="com.nutriscore.app">` (version 1.0.0, android-versionCode 10000 unchanged).
  - `Backend/.env.example` — `GOOGLE_PACKAGE_NAME=com.nutriscore.app` (used by `Backend/routes/billing.js` for Google Play receipt verification).
  - `mobile/.gitignore` — added `release/` so staged AAB binaries are not committed.
- Verified no other references: repo-wide grep for `com.nutriscan.app` returned only
  those two files. Frontend has NO hardcoded `play.google.com` / `market://` /
  `id=com.` package links (grep found 0 matches), so no store-link updates needed.
- Regenerated the Android platform (`cordova platform rm android` + `platform add android`).
  This was REQUIRED: `cordova prepare` updates `PACKAGE_NAMESPACE` but does not relocate
  the Java source dir, so `MainActivity.java` would have stayed in `com/nutriscan/app`
  and mismatched the namespace. After re-add: `PACKAGE_NAMESPACE=com.nutriscore.app`,
  `java/com/nutriscore/app/MainActivity.java` present, old `com/nutriscan` dir gone.
  All 4 plugins reinstalled (purchases, secure-storage-echo, android-permissions,
  annotated-plugin-android).
- Build: `npm run build:aab` -> BUILD SUCCESSFUL in 5m56s.
  - Output: `mobile/platforms/android/app/build/outputs/bundle/release/app-release.aab`
  - Copied to `mobile/release/nutriscore-1.0.0-vc10000.aab` (4.62 MB).
- AAB verified: `jarsigner -verify` => "jar verified", signed by
  `CN=NutriScan, OU=Mobile, O=NutriScan, L=Unknown, ST=Unknown, C=IN`.
  Binary manifest contains `com.nutriscore.app`, `com.nutriscore.app.MainActivity`,
  version `1.0.0`, CAMERA + INTERNET permissions; old package absent.
- Keystore `mobile/nutriscan-release.keystore`, alias `nutriscan`, valid to 2053-12-11,
  SHA256 `3C:AB:59:60:5C:8C:6D:43:D4:58:84:99:FE:6A:E7:B7:6F:E9:22:2D:64:49:AF:68:83:DA:6E:D6:5E:E8:4E:83`.
- Toolchain used: Node 22.18.0, JAVA_HOME = Adoptium JDK 17.0.16.8 (note: `javac` on
  PATH is 21, so JAVA_HOME must be set explicitly for the build), Android SDK
  platform 36 + build-tools 36.0.0, cordova-android 15.1.0, Gradle 8.14.2, AGP 8.10.1.

### FLAGGED — must resolve before/alongside the Play upload
1. `Frontend/.env.cordova` has EMPTY `VITE_REVENUECAT_ANDROID_KEY` and EMPTY
   `VITE_GOOGLE_CLIENT_ID`. Both degrade gracefully (`|| ''`), so the build succeeded,
   but in THIS AAB in-app purchases and Google sign-in are non-functional. Fill both
   and rebuild before shipping a monetised release.
2. Production backend env (Render) must set `GOOGLE_PACKAGE_NAME=com.nutriscore.app`
   — only `.env.example` was updated here.
3. The RevenueCat dashboard + Play Console app must both use `com.nutriscore.app`;
   a package rename invalidates any prior store/RevenueCat config for the old id.
4. `mobile/build.json` keystore password is the weak literal `changeit-nutriscan`
   (gitignored, but should be rotated to a strong password).
5. Renaming the package after a Play release is impossible — confirm `com.nutriscore.app`
   is final before first upload.

## 2026-07-31 — Created BRAND_AND_FEATURES.md (logo design brief)
- New file: `BRAND_AND_FEATURES.md` at repo root. Purpose: hand to an LLM/designer to get
  logo recommendations. Covers identity, full web+mobile feature list, exact colour tokens
  (light + dark + semantic), typography, shape/icon/motion language, languages/RTL, current
  logo assets, and a concrete logo brief.
- Read (not assumed): `mobile/config.xml`, `Frontend/src/tailwind.css`,
  `Frontend/DESIGN_TOKENS.md`, `Frontend/src/App.jsx`, `Frontend/src/utils/scoreColor.js`,
  `macroMeta.js`, `languages.js`, `Backend/config/plans.js`, `Backend/utils/scanQuota.js`,
  `Backend/routes/*.js` (route inventory), both `package.json`s, `public/favicon.svg`.
- FLAGGED in the doc:
  - Naming drift: repo folder `NutriScan-mainn`, Android package id `com.fitscoreai.app`,
    shipped product name `NutriScore`. Doc treats NutriScore as canonical.
  - `Frontend/public/favicon.svg` is an unrelated purple/blue lightning-bolt mark
    (`#863bff` / `#7e14ff` / `#47bfff`) from another project — matches no palette token and
    should be replaced with the new logo.
  - Header brand mark is a placeholder lucide `Apple` icon, not a real logo.
  - `PROJECT_SETUP.md` at repo root documents a *different* product (Havenn study-space
    platform, `com.havenn.studyspace`) — stale/mismatched for this repo; not used as a source.
  - Page bg: `tailwind.css` ships `#F5F5F5` while `DESIGN_TOKENS.md` §13 specifies
    `#EBEEEC`; doc records both.

## 2026-07-31 — New logo wired into favicon/PWA, Android launcher icon + splash

Replaced the leftover purple lightning-bolt mark with the supplied emerald
"N + leaf" logo across web and Android. Branding/asset files only; no app logic,
routes, or unrelated config touched.

### Source masters (new, committed)
- `resources/icon.png` — 1024x1024, transparent, mark at 94% of canvas.
- `resources/splash.png` — 2732x2732, transparent, mark at 52% (safe area, since
  the Android 12 splash icon is circle-masked and cropped per device).
- The supplied asset was a **JPEG flattened on solid black**, not a transparent
  PNG. A plain colour-key would leave a dark halo, because every antialiased edge
  pixel is already blended toward black. Alpha is therefore derived from
  luminance (ramp 10→46) and the colour un-premultiplied (`c / a`) — the exact
  inverse of "src over black". Result: 58.65% fully clear, 2.59% partial edge,
  38.76% opaque, no halo when composited over white or `#F5F5F5`.

### `mobile/scripts/generate-resources.js` (rewritten)
Now reads the two masters instead of `Frontend/public/favicon.svg`, and emits
**both** platforms in one pass (27 assets):
- `mobile/res/android/` — 6 legacy launcher icons (on `#F5F5F5`, unmasked so a
  transparent PNG would show wallpaper through), 6 adaptive foregrounds (inset to
  the 66/108 safe zone) + 6 adaptive background fills, `splash/splash-icon.png`
  (1152px), `play-store-icon.png` (512, no alpha).
- `Frontend/public/icons/` — 16/32 favicons, 180 apple-touch-icon (flattened on
  emerald `#10B981`, iOS disallows alpha), 192/512 PWA, 512 maskable (62% inset).
- `Frontend/public/favicon.ico` — 16/32/48 multi-size. Hand-built container
  (6-byte header + 16-byte dir entries + PNG payloads); sharp cannot emit ICO and
  the format is too simple to justify a dependency. Verified: type=1, 3 entries,
  each decodes at its declared size.

### Web
- `Frontend/index.html`: added `favicon.ico`, 16/32 PNG, apple-touch-icon,
  `manifest` link, and per-scheme `theme-color` `#10B981`. Kept the existing
  pre-paint theme script untouched.
- New `Frontend/public/manifest.webmanifest`: `theme_color` `#10B981`,
  `background_color` `#F5F5F5`, 192 + 512 + maskable-512. No vite-plugin-pwa in
  this project, so a plain manifest is the right shape.
- Vite rewrites all of these hrefs to `./` for the cordova build automatically
  (verified in `mobile/www/index.html`), so one set of tags serves both targets.

### `mobile/config.xml` (icon/splash lines only)
- Added a density-less `<icon src="res/android/icon/xxxhdpi.png" />` default.
- Added `AutoHideSplashScreen=true`, `SplashScreenDelay=2000`,
  `FadeSplashScreen=true`, `FadeSplashScreenDuration=400`. These are read by
  `SplashScreenPlugin` built into cordova-android 15 — **no plugin needed**.
  Default delay is `-1` (hide on `onPageFinished`), which fires before React
  mounts and flashed an empty shell.
- Splash background stays `#F5F5F5`, matching `--ns-page-bg` (light) so the
  handover to first paint has no colour jump. NOTE: the asset reads on light, not
  white — `#F5F5F5` was kept deliberately over `#FFFFFF`.

### cordova-res: evaluated and rejected (do not retry)
Installed and run it as instructed; it is the wrong tool for this platform version:
1. It writes `<splash density="port-*">` tags. cordova-android 15 hard-rejects
   these — `prepare.js:warnForDeprecatedSplashScreen` emits "The `<splash>` tags
   were detected and are no longer supported. Please migrate to ... 
   `AndroidWindowSplashScreenAnimatedIcon`". Its 12 full-screen splash PNGs are
   dead weight under the Android 12 splash API.
2. It will not run on Node 22 here: npm resolved `tslib` into the lockfile but
   never wrote it to disk (`npm i`, `--force`, `--install-strategy=nested` all
   reported "up to date" with the dir absent); had to `npm pack` + untar it by
   hand to even get `--version` to respond.
Both it and `tslib` were uninstalled; lockfile and `node_modules` verified clean.
`generate-resources.js` targets exactly what cordova-android 15 consumes.
Also confirmed absent from cordova-android 15: `SplashShowOnlyFirstTime`,
`SplashMaintainAspectRatio`, `ShowSplashScreenSpinner` — so the requested
`SplashShowOnlyFirstTime` was **not** added; it would be a no-op.

### Verification
- `cordova platform rm android && cordova platform add android` — clean re-add,
  all 3 plugins reinstalled, so no stale icon/splash resources survive.
- `cordova build android -- --packageType=apk` → **BUILD SUCCESSFUL** (2m 2s).
- APK inspected: 24 launcher entries (6 legacy `mipmap-*-v4/ic_launcher.png`,
  6 adaptive fg, 6 bg, 6 `ic_launcher.xml`) + `drawable-nodpi-v4/`
  `ic_cdv_splashscreen.png`. Native `cdv_themes.xml` resolves
  `windowSplashScreenAnimatedIcon` → `@drawable/ic_cdv_splashscreen`,
  `windowSplashScreenBackground` → `#F5F5F5`.
- `Frontend`: `npm run build` OK, all 6 icons + `manifest.webmanifest` +
  `favicon.ico` present in `dist/`.

### Docs updated
- `mobile/README.md` — masters table, dual-output `gen:res`, why not cordova-res.
- `mobile/.gitignore` — comment now points at the masters, not the old SVG.

### Still open (not done, needs a decision)
- `Frontend/public/favicon.svg` (purple `#863bff`) and `icons.svg` are still on
  disk. Nothing in `Frontend/src` imports either; the only live reference was the
  `index.html` favicon link, now repointed. `favicon.svg` is still emitted into
  `dist/`. Safe to delete once someone confirms no external/bookmark reliance —
  left in place rather than deleting unasked.
- The in-app brand marks are unchanged and still don't match the new logo: the
  header/sidebar mark is a placeholder lucide `Apple` icon, and the splash/in-app
  glyph in `tailwind.css` is a hand-drawn leaf on an emerald squircle. Only the
  OS-level icons (favicon/PWA/launcher/splash) were in scope here.
- `resources/` is committed at the repo root and is *not* covered by the root
  `.gitignore`; the generated `mobile/res/` and `Frontend/public/icons/` are
  regenerated output (`icons/` is currently untracked, not ignored — worth an
  ignore rule if it shouldn't be committed).

## 2026-08-01 — Renamed the app to FitScore (loading screen + all user-visible copy)

### Changed
- Brand display name is now **FitScore** everywhere it is shown to a user.
  Case-sensitive `NutriScore` -> `FitScore` across 35 source files:
  - Loading/splash: extracted `Frontend/src/components/SplashScreen.jsx` out of
    the inline `isRestoring` branch in `App.jsx`. It now shows the real brand
    mark (`/icons/icon-192.png`, generated from `resources/icon.png` by
    `npm run gen:res`) plus a "FitScore" wordmark and "Loading FitScore...",
    on `var(--ns-surface)` — deliberately matching the native Android splash
    (`AndroidWindowSplashScreenAnimatedIcon` + `Background` in config.xml) so
    the system splash hands over without a brand/colour jump. Previously it drew
    a generic green leaf `<svg>` that matched nothing.
    Added `role="status" aria-live="polite" aria-busy="true"`; the `<img>` is
    `alt=""` (decorative — the wordmark carries the meaning).
    Icon path is absolute on purpose: works from the web origin root and from
    the Cordova shell at `https://localhost/` on any route.
  - `Frontend/index.html` `<title>`, `Frontend/public/manifest.webmanifest`
    (`name`/`short_name`), `Frontend/public/_headers`, `Frontend/package.json`
    (`name: fitscore`).
  - `mobile/config.xml` `<name>` + author display name; `mobile/package.json` +
    `package-lock.json` (`fitscore-mobile`). Ran `cordova prepare android` —
    `platforms/android/.../values/cdv_strings.xml` now has
    `<string name="app_name">FitScore</string>`, so the launcher label is FitScore.
  - All 8 i18n locales (`en/hi/es/fr/de/ar/ur/ne`): `scanned_with_ai`,
    `top_users`, `no_requests_desc`, `ai_processing`. Non-Latin scripts verified
    intact after the rewrite.
  - Components: `Profile.jsx`, `PaywallContent.jsx`, `Results.jsx` (share title +
    `fitscore_*.png` download filename), `StreakLeaderboard.jsx`,
    `BarcodeScanner.jsx` (+ its test), `Login.jsx`, `SignUp.jsx`,
    `Onboarding.jsx`, `DashboardRedesign.jsx`, `App.jsx` shell titles and the
    `'FitScore User'` display-name fallback.
  - Backend user-visible strings + log prefixes: `server.js`, `routes/analyze.js`,
    `routes/auth.js`, `config/queue.js`, `config/worker.js`,
    `middleware/profileValidator.js`, `utils/mailer.js` (from-name only),
    `utils/ageCheck.js`.
  - `docs/home_screen.html` mockup.

### Added
- `Frontend/src/components/SplashScreen.test.jsx` (6 tests): wordmark, loading
  copy, a regression guard asserting the rendered text contains no `/nutri/i`,
  the exported `BRAND_NAME`, the icon `src` + absence of the old inline `<svg>`,
  and the busy status region. Registered `SplashScreen.jsx` in
  `Frontend/jest.config.js` `collectCoverageFrom`.

### Deliberately NOT renamed (would break live state — do not "fix" these blindly)
- `localStorage` keys `nutriscan_auth` / `nutriscan_profile` (`App.jsx`) and
  `fitscan_theme` (`index.html` + `ThemeToggle.jsx`): renaming logs every
  existing user out / resets their theme.
- `APP_USER_ID_PREFIX = 'nutriscan_'` in `services/revenueCatService.js`: this is
  the RevenueCat app-user-id namespace. Changing it orphans every existing
  subscriber record.
- Email/domain literals: `no-reply@nutriscore.app` (`utils/mailer.js`
  `MAIL_FROM_ADDRESS` default), `dev@nutriscore.app` + `https://nutriscore.app`
  (`config.xml` author). The sender domain is DNS/Brevo-verified; changing it
  silently breaks password-reset mail.
- `mobile/nutriscan-release.keystore` filename (referenced by `build.json`).

### Flagged for a decision
- **The logo is still an "N".** `resources/icon.png` / `splash.png` are a
  stylised leaf-"N" from the NutriScan era, now paired with the name "FitScore"
  on both the launcher icon and the splash. Needs a new mark, then
  `npm run gen:res` in `mobile/`.
- `Frontend/src/components/Profile.jsx:1063` still mails
  `support@nutrisnap.app` — a *third* dead brand. Needs a real support address.
- Widget id stays `com.fitscoreai.app` and the API host
  `fitscore-rqgb.onrender.com` (already FitScore-era); `config.xml` also lists
  `allow-intent` for a different host `fitscore-6hqp.onrender.com` — worth
  checking whether that is stale.

### Verified
- `Frontend`: `npx jest --maxWorkers=2` -> 17 suites / 166 tests passed.
  (A full-parallel run intermittently times out `SignUp.test.jsx`; it passes in
  isolation and at `--maxWorkers=2`. Pre-existing contention flake, unrelated.)
- `Backend`: `npx jest` -> 21 suites / 184 tests passed.
- `npm run build:cordova` succeeded; `mobile/` `npm run sync:www` +
  `cordova prepare android` re-ran, so `mobile/www/index.html`,
  `mobile/www/manifest.webmanifest` and
  `platforms/android/app/src/main/assets/www/` all carry the FitScore title.
- `npx eslint src/components/SplashScreen.jsx src/App.jsx` -> clean.
- Dev server check: `GET /icons/icon-192.png` -> `200 image/png 50730`,
  page `<title>` -> `FitScore`.
- Not verified: no on-device/emulator run and no APK build in this session, and
  the Playwright MCP browser was unreachable (`ECONNREFUSED 127.0.0.1:54686`),
  so there is no screenshot of the splash — only the jsdom assertions above.

## 2026-08-01 — Created SECURITY_MEASURES.md (web + Android security inventory)
- New file: `SECURITY_MEASURES.md` at repo root. Current-state inventory (companion to
  `SECURITY_HARDENING.md`, which is the change history).
- Built by reading actual source: `Backend/server.js`, `config/{cors,cookies,cloudinary}.js`,
  `middleware/{auth,csrf,rateLimiter,requirePlan,requireSubscription,validateRequest,validator}.js`,
  `utils/{tokens,securityLogger,ownershipCheck,ageCheck,scanQuota}.js`, `validation/schemas.js`,
  `routes/{auth,payment,revenueCatSubscriptions,billing,analyze}.js`, `Frontend/src/api/client.js`,
  `Frontend/src/utils/{passwordPolicy,nativePermissions}.js`, `Frontend/index.html`, `vite.config.js`,
  `mobile/config.xml`, `mobile/resources/android/*`, `render.yaml`, all `package.json` + `.gitignore`.
- Documents: full stack tables (backend/web/Android/third-party), auth+session (JWT HS256 15m,
  refresh rotation + family revocation, token_version, bcrypt 12, lockout, enumeration resistance),
  authorization/ownership, Zod validation + injection defence, transport/helmet/CORS, CSRF
  double-submit, payment + webhook integrity (Razorpay HMAC, RevenueCat re-fetch + signature +
  idempotency), rate limiting table, privacy-preserving security logging, Android hardening
  (Keystore tokens, no cleartext, allowBackup=false, R8, allowlists), test inventory.
- VERIFIED negatives worth keeping: no secrets tracked in git (`git ls-files --error-unmatch`
  fails for `Backend/.env`, `mobile/build.json`, `mobile/nutriscan-release.keystore`).
- FLAGGED gaps (Section 12): NO security headers/CSP on the web SPA at all (repo-wide grep for
  Content-Security-Policy/X-Frame-Options/Referrer-Policy/Permissions-Policy = 0 matches; helmet CSP
  is API-only, render.yaml frontend block commented out); no email verification; no MFA;
  `middleware/requireSubscription.js` is dead code that reads `req.user` (never populated → would
  401 always); API hostname inconsistency (`fitscore-rqgb` in .env.cordova/config.xml vs
  `fitscan-api` in render.yaml); no cert pinning; no dependency/secret scanning in CI; legacy JWTs
  without tokenVersion still valid until expiry; profile pics stored base64 in users.profile JSONB;
  `google-auth-library` required at runtime but only a transitive dep of `googleapis`.

## 2026-08-02 — Added privacy policy to the web application
- New file: `Frontend/src/components/PrivacyPolicy.jsx`. Full 12-section policy page
  (collection, use, processors, GDPR legal basis, retention, rights, security, children,
  transfers, not-medical-advice, changes, contact) plus TOC, "Last updated" date and a
  back button.
- Content derived from the ACTUAL data model and providers, not a template:
  `Backend/database-schema.sql` (users: email/password_hash/google_id/name/points/streak/
  profile JSONB/scheduled_deletion_at/failed_login_attempts...; scans: image_url/nutriments/
  raw_product_data/servings/eaten...), `user_medical_conditions`, `user_health_goals`,
  `refresh_tokens`, and `Backend/.env.example` providers (Gemini, Cloudinary, Open Food Facts,
  Google Sign-In/Play Integrity, RevenueCat, Razorpay, Brevo, Render).
- Documents the real 7-day scheduled-deletion window and the cancel-by-logging-in behaviour
  already implemented in Profile.jsx.
- Routing (`Frontend/src/App.jsx`): added PUBLIC route `/privacy-policy` (outside
  `DesktopAppShell`, so it resolves with no session — required by the Play listing and the
  Google OAuth consent screen) plus a `/privacy` → `/privacy-policy` redirect.
- `Profile.jsx`: the privacy row now navigates to `/privacy-policy` instead of opening the
  old one-sentence `modal === 'privacy'` stub, which was deleted. Glyph changed
  `LifeBuoy` → `Lock` (LifeBuoy is the support glyph; matches the intent recorded in
  `Frontend/UI_POLISH_CHANGELOG.md`). Added `useNavigate`.
- `Login.jsx` / `SignUp.jsx`: added an `.auth-legal` line linking the policy pre-signup
  (SignUp wording: "By creating an account you agree to our Privacy Policy").
- HASHROUTER TRAP handled twice: `main.jsx` swaps BrowserRouter→HashRouter for the Cordova
  build, so (a) added `routeHref()` to `Frontend/src/utils/platformUtils.js` which prefixes
  `#` on mobile — plain `href="/privacy-policy"` would dead-end at
  `https://localhost/privacy-policy` in the WebView; and (b) the TOC uses buttons +
  `scrollIntoView`, not `#id` anchors, which would overwrite the route hash and unmount the page.
  Plain `<a>`/`routeHref` was used on Login/SignUp rather than `<Link>` because
  `Login.test.jsx`/`SignUp.test.jsx` render those components with NO Router wrapper.
- Styles: added `.auth-legal` and a `.legal-*` block to `Frontend/src/tailwind.css`
  (sticky header, 720px measure, 2-col TOC ≥768px, `scroll-margin-top: 72px` so anchored
  headings clear the sticky header). Uses existing tokens only.
- VERIFIED: `npm run build` passes (only the pre-existing >500 kB chunk warning);
  Login + SignUp + platformUtils suites pass (15 tests); a temporary render test confirmed
  all 12 sections and 12 TOC entries mount, then was deleted. ESLint on the touched files
  reports only 4 PRE-EXISTING Profile.jsx errors (unused `authToken` prop ×3,
  set-state-in-effect), none from this change.
- FLAGGED for the owner: the policy is factual product documentation, not legal advice —
  needs counsel review before publishing. `LAST_UPDATED` and `SUPPORT_EMAIL`
  (`support@nutrisnap.app`, copied from Profile's `mailSupport`) are constants at the top of
  the file; note that address does not match the `nutriscore.app` / `com.fitscoreai.app`
  branding used elsewhere, so it may be wrong. Terms & Conditions is still a one-line modal
  stub and should get the same treatment.

## 2026-08-02 (follow-up) — Rewrote the privacy policy to match the ACTUAL app
- Root cause of the follow-up request: the route/click path was already fine (verified
  `GET /privacy-policy` → 200, and a temp test confirmed the Profile row click renders the
  page). The problem was CONTENT — the first draft was accurate about the DB columns but
  still read like a generic template and, worse, MISSED what the app actually exposes.
- Investigated and then disclosed, explicitly, what other users can see (new §3):
  - `Backend/routes/auth.js` GET `/leaderboard` → `SELECT name, points, streak ... LIMIT 50`,
    so display names ARE visible to every signed-in user. Policy now says so and tells the
    user they can rename themselves in Profile → Personal detail.
  - `Backend/routes/features.js` → selects `u.name as author_name`, so feature requests are
    posted under your display name.
  - `Backend/routes/scans.js` upserts every scan into the SHARED `product_database`
    (product_name, brand, ingredients, nutriments, latest_score, scan_count,
    first/last_scanned_by). Policy states the product data is shared but the photo, score
    history and health profile are not, and that the scanner reference is not shown to others.
- CORRECTED a retention inaccuracy in the first draft: `Backend/server.js` scheduled-deletion
  purge DELETEs users/scans/health goals/medical conditions/feature_requests but only
  `UPDATE product_database SET first_scanned_by = NULL / last_scanned_by = NULL`. The product
  rows SURVIVE account deletion. §8 now admits this exception instead of implying a full wipe.
- Added §6 (cookies/on-device storage) naming the real artefacts: `token` + `refresh_token`
  HttpOnly cookies (`Backend/routes/auth.js` setSessionCookies), the CSRF cookie
  (`middleware/csrf.js`), Android Keystore on mobile, and the localStorage keys
  `nutriscan_auth`, `nutriscan_profile`, `fitscan_language`, `fitscan_theme`.
- Added §1 "short version" up top and made §7 flag health data as GDPR special-category
  (consent-only). §13 now warns allergy users to read the physical label.
- Grew 12 → 15 sections. Rewrote in the product's own voice using the real feature set from
  `BRAND_AND_FEATURES.md` (score out of 10, ingredient audit, barcode, food database,
  streaks/points, 7-day deletion grace).
- NAMING DECISION recorded in a code comment: used **FitScore** because `Frontend/index.html`
  `<title>`, `mobile/config.xml` `<name>` and the en translations all say FitScore, even
  though `BRAND_AND_FEATURES.md` says "NutriScore" and the package id is `com.fitscoreai.app`.
  Did not invent a resolution — flagged instead.
- Added a "keep this in step with the code" comment block at the top of PrivacyPolicy.jsx
  listing the 8 source files whose changes should force a policy update.
- VERIFIED: eslint clean on the file; `npm run build` passes; temp tests confirmed 15 headings
  + 15 TOC buttons + section ids all resolve, app-specific strings present, and the
  Profile-row → policy-page click path works (needed `import '../i18n/index.js'` in the
  harness, since the row label comes from `t('privacy_policy')`). All temp files deleted.
- STILL FLAGGED: needs counsel review; `SUPPORT_EMAIL = support@nutrisnap.app` (from Profile's
  mailSupport) matches neither `nutriscore.app` nor `fitscoreai` and is probably wrong;
  Terms & Conditions remains a one-line modal stub.

## 2026-08-02 - Privacy policy implementation corrected against current code
- Reworked `Frontend/src/components/PrivacyPolicy.jsx` as a public, 17-section policy for
  NutriScore web and Android (`com.fitscoreai.app`), retaining the existing `/privacy-policy`
  route and links from Login, SignUp, and Profile.
- Rejected the inaccurate requested claim that the service stores no data: the policy now
  explicitly covers persisted account/profile/scan/community/subscription/security records,
  browser profile caches, Cloudinary images, and the Gemini profile fields used in prompts.
- No-refund wording is qualified by applicable law and Google Play/payment-provider policy;
  cancellation, uninstall, and account-deletion effects are explained and the official Google
  Play refund-policy page is linked.
- Disclosed two implementation gaps rather than promising complete deletion: automated account
  purge does not delete Cloudinary assets, and votes on other users' feature requests may retain
  an internal numeric user id. Also corrected feature-board visibility and Play Integrity wording.
- Updated SignUp acknowledgement copy and added accessible 44px targets, focus indicators, and
  legal-page link styling in `Frontend/src/tailwind.css`.
- Added `Frontend/src/components/PrivacyPolicy.test.jsx` (4 tests). Verified: privacy tests 4/4,
  SignUp tests 4/4, targeted ESLint clean, and `npm.cmd run build` succeeds. Existing Vite large
  chunk warning remains unrelated.

## 2026-08-02 - Renamed the application display brand to bitezsnap
- Replaced the live `NutriScore` display brand and remaining user-visible `FitScan` references
  with the exact lowercase name `bitezsnap` across the frontend, backend response/email/AI copy,
  all eight i18n locales, PWA metadata, Cordova metadata, tests, examples, and active product,
  architecture, billing, privacy, and security documentation.
- Updated package metadata to `bitezsnap` (`Frontend/package.json`) and `bitezsnap-mobile`
  (`mobile/package.json` and `mobile/package-lock.json`). Shared result images now download as
  `bitezsnap_<product>.png`; support and default sender metadata now use `bitezsnap.app`.
- Cordova `<name>` and author display text now use `bitezsnap`. `cordova prepare android`
  regenerated `mobile/platforms/android/app/src/main/res/values/cdv_strings.xml` with
  `<string name="app_name">bitezsnap</string>`. The Cordova-targeted Vite build succeeded and
  synced 17 files into `mobile/www`.
- Compatibility-critical identifiers were deliberately preserved: Android package id
  `com.fitscoreai.app`, deployed `fitscore`/`fitscan` Render URLs and service names, JWT/CSRF and
  localStorage namespaces, Google Play product ids, the Play Integrity plugin id/class, and the
  RevenueCat `nutriscan_` App User ID prefix. Renaming them would invalidate the existing Android
  listing, sessions/tokens, deployments, products, or subscriber mappings.
- Residual audit found no old display brand in active tracked source/config or the generated web
  and Cordova application bundle. Old names remain only in historical changelog/context entries,
  compatibility identifiers, generated plugin paths, and stale Gradle intermediates.
- Verification: backend full suite 22/22 suites and 195/195 tests passed; frontend full serialized
  suite 18/18 and 170/170 passed; rename-sensitive frontend subset 4/4 suites and 19/19 passed;
  `vite build --mode cordova`, `sync:www`, and `cordova prepare android` passed. The first Cordova
  debug-build wrapper timed out and its Gradle processes were stopped; a clean direct
  `gradlew assembleDebug --no-daemon` retry then succeeded in 1m25s. `aapt2 dump badging` verified
  the rebuilt 9,367,979-byte APK reports `application-label:'bitezsnap'` for every locale while
  retaining package identity `com.fitscoreai.app`.

## 2026-08-02 - Completed the bitezsnap web rename (split JSX wordmarks)
- Follow-up web audit found why old branding was still visible despite the prior exact-string
  replacement: several wordmarks split `NutriScore` across nested JSX nodes, such as
  `Nutri<em>Score</em>` and `<span>Nutri</span><span>Score</span>`, so the contiguous-text search
  could not detect them.
- Replaced the split wordmarks with lowercase `bitezsnap` in `Frontend/src/App.jsx`,
  `components/Login.jsx`, `SignUp.jsx`, `ResetPassword.jsx`, and `Onboarding.jsx`. This covers
  the desktop sidebar, landing/login panel and form, signup page, reset-password page, and every
  onboarding header. Updated the stale `Frontend/package-lock.json` root package name too.
- Strengthened `Login.test.jsx` and `SignUp.test.jsx` with regression assertions that rendered
  auth pages contain `bitezsnap` and do not contain the old `Nutri Score` text.
- Verification: targeted Login + SignUp + Splash tests passed (3 suites / 14 tests); the normal
  `vite build` passed; strict source audit found zero continuous or split old display-brand
  matches; `Frontend/dist` and `mobile/www` each contain zero old-brand matches and both expose
  `bitezsnap` in `index.html` and `manifest.webmanifest`.
- Rebuilt/synced the Cordova web bundle, ran `cordova prepare android`, and rebuilt the debug APK
  successfully. The only old capitalized name remaining inside generated Android web assets is
  `FitScorePlayIntegrity`, the compatibility-critical native plugin service identifier—not
  user-visible branding. Targeted ESLint found only pre-existing Onboarding issues at lines 61,
  119, and 351 (two hook warnings and two unused-variable errors), unrelated to this rename.

## 2026-08-02 - Glow-removal Phase 1 audit
- Completed a read-only audit of frontend JSX/TSX/CSS/SCSS/Tailwind/SVG sources for colored
  box shadows, drop shadows, glow keyframes, halo rings, and blurred decorative overlays.
- Confirmed live glow effects in the result progress ring, toast/state treatments, profile and
  health/settings controls, primary-action system, desktop/sidebar shell, mobile scan FAB, auth
  focus states, and the unrouted `DashboardRedesign.jsx` mockup. Also found dormant or overridden
  legacy glow declarations and two unreferenced filtered SVG assets.
- No application source or styling was changed. Implementation is intentionally waiting for the
  user's review and approval of the Phase 1 report.

## 2026-08-03 - Fresh Cordova debug APK delivered
- Ran `mobile/npm run build:android`, which rebuilt the Vite SPA in Cordova mode, synchronized
  17 files into `mobile/www`, and completed the Cordova Android/Gradle debug build successfully.
- Copied the installable artifact to `D:\NutriScan-mainn\bitezsnap-debug.apk` (9,367,979 bytes).
- Verified with Android build-tools 36: application label `bitezsnap`, package
  `com.fitscoreai.app`, versionName `1.0.0`, versionCode `10000`, compile/target SDK 36.
- `apksigner verify` passed using APK Signature Scheme v2 with the Android debug certificate.
  SHA-256: `2615C4E70662CE29BAD9334FA288DD8B768A1ED6B4E4BB294C09A793A0BF340D`.

## 2026-08-03 - Replaced bitezsnap logo across web and Android
- Used the user-supplied `D:\Downloads\bitezsnap logo.png` unchanged as the new visual master.
  Created a 1024x1024 application master at `resources/icon.png` and a transparent 2732x2732
  Android-safe splash master at `resources/splash.png` with the icon centred inside the safe area.
- Added the shared `BrandLogo.jsx` image component and wired it into the desktop application shell,
  login/signup desktop and compact headers, reset-password page, onboarding header, React loading
  screen, and the standalone dashboard redesign while retaining the bitezsnap wordmark text.
- Updated the asset generator for the finished opaque dark icon, then regenerated Android legacy
  and adaptive launcher icons, Play Store art, Android 12 splash art, PWA icons, Apple touch icon,
  PNG favicons, ICO favicon, and the legacy SVG favicon surface.
- Verification: Login/SignUp/Splash tests passed (3 suites, 14 tests), production web build passed,
  Cordova web build/sync passed, and Cordova Android debug build passed. Replaced the top-level APK
  at `D:\NutriScan-mainn\bitezsnap-debug.apk` (10,475,331 bytes); label `bitezsnap`, package
  `com.fitscoreai.app`, target SDK 36, APK Signature Scheme v2 verified. SHA-256:
  `9E991098A553A525F701A619E5AA4E0B310114F40924B92C0CAF8CC5C6CDA88C`.


## 2026-08-03 — Changed Android package name from com.fitscoreai.app to com.bitezsnap.app
- Updated `mobile/config.xml` widget id from `com.fitscoreai.app` to `com.bitezsnap.app`.
- Updated `Backend/.env.example` GOOGLE_PACKAGE_NAME to `com.bitezsnap.app`.
- Updated `Frontend/src/components/PrivacyPolicy.jsx` ANDROID_PACKAGE constant.
- Updated `BRAND_AND_FEATURES.md` package id documentation.
- Updated `SECURITY_MEASURES.md` package id reference.
- Updated all test references in `Backend/routes/playIntegrity.test.js`:
  - requestPackageName in mock integrity token
  - packageName in appIntegrity
  - GOOGLE_PACKAGE_NAME env var
  - Google Play Integrity API URL
- **ACTION REQUIRED**: Update Google Play Console configuration with new package name.
- **ACTION REQUIRED**: Update RevenueCat app configuration to match new package name.
- **ACTION REQUIRED**: Update Play Integrity API allowlist if configured.
- **ACTION REQUIRED**: Rebuild and re-sign the Android APK/AAB with new package identity.
- **CRITICAL**: This is a breaking change for existing users — package name changes are treated as a different app by Android. Existing installs cannot be upgraded; users must uninstall the old app and install the new one. All local data (secure storage tokens, WebView localStorage) will be lost. Server-side accounts remain, but users must sign in again.

## 2026-08-03 - Built TrailForge standalone 2D physics driving game
- Added a new isolated `trailforge/` Vite + strict TypeScript + Matter.js project so the existing
  bitezsnap frontend/backend/mobile worktree was not replaced or coupled to the game.
- Created original TrailForge branding and a responsive procedural Canvas visual system: layered
  parallax skies/mountains/clouds, five environment palettes, terrain strata/surfaces, pooled
  decorations/pickups/particles, six procedural vehicle silhouettes, driver, suspension, HUD,
  menus, garage, workshop, stage selector, settings, pause, and game-over presentation.
- Physics uses separate Matter bodies for chassis, front wheel, rear wheel, and repositioned head
  collision sensor. Both wheels collide with terrain and receive bounded rotational torque. Four
  correctly measured damped constraints form two triangulated suspension assemblies so wheels
  retain lateral position while visibly compressing/rebounding. Grounded axle alignment and
  one-wheel roll damping keep acceleration controllable; vehicle-specific capped air torque keeps
  GAS/BRAKE orientation control, with the dirt bike and buggy more agile than the starter jeep.
- Added endless chunked procedural terrain with accurate matching collision segments, gradual
  0-300 m onboarding, increasing hill amplitude/slope/roughness, generation ahead, unloading
  behind, deterministic tests, pooled coins/fuel cans, and lightweight decorations.
- Implemented full run loop: gas, brake/reverse, simultaneous pointer controls, smooth lead camera,
  fuel drain/refills, bronze/silver/gold coins, airtime tiers, front/backflip tracking, landing/dust/
  pickup effects, driver-impact/upside-down/out-of-fuel/stuck failures, slowed crash finish,
  detailed results, instant retry, pause/resume/restart, and in-pause audio settings.
- Added permanent LocalStorage progression (`trailforge.save.v1`): six vehicles, engine/grip/
  suspension/fuel upgrades to level 20 with progressive costs, five unlockable stages with real
  gravity/grip/terrain/fuel differences, seven achievements, balance/best distance, selection,
  unlocks, settings, and corruption-safe save migration defaults.
- Audio is original and asset-free via Web Audio synthesis: RPM-responsive filtered engine,
  procedural music notes, and click/coin/fuel/landing/crash/reward/achievement/game-over cues.
- Added `F3`/backtick physics debug rendering for collision bodies, constraints, center of mass,
  chunk boundaries, FPS, velocity, angular velocity, contacts, suspension links, and body counts.
- Verification in `trailforge/`: `npm test` -> 3 files / 8 tests passed (including 10,000 m terrain,
  chunk unloading, real forward wheel-torque simulation, brake/reverse, pooling cadence, and save
  reload); `npm run build` succeeded (150.06 kB JS / 27.71 kB CSS before gzip). A real headless
  Chrome and Edge smokes at 1440x900 and 844x390 drove sustained runs, paused/resumed, verified
  two-finger GAS+BRAKE, 44px+ targets, touch-action/overflow safety, and produced zero page/console errors.
- Run with `cd trailforge`, `npm install`, `npm run dev`. Browser QA screenshots are generated into
  ignored `trailforge/artifacts/` by `scripts/browser-smoke.mjs`.

## 2026-08-03 - Regenerated favicon set and built signed Play Store AAB
- Re-ran `mobile/npm run gen:res` from the current 1024x1024 bitezsnap master logo. Regenerated
  27 web/Android assets, including ICO, 16/32px PNG favicons, Apple touch icon, PWA icons,
  adaptive/legacy Android launcher icons, splash art, and Play Store icon.
- Verified a normal Vite production build and the Cordova-targeted build both succeed. The
  production and Cordova HTML reference the ICO/16px/32px icons correctly; the built icon copies
  match the generated sources, and the final AAB contains the favicon/PWA files under
  `base/assets/www/`.
- The first AAB attempt exposed stale generated Android platform state: `MainActivity.java` still
  used `com.fitscoreai.app` after `config.xml` changed to `com.bitezsnap.app`. Removed and recreated
  only the generated Cordova Android platform with the locally installed cordova-android 15.1.0,
  then confirmed `MainActivity` and Gradle namespace use `com.bitezsnap.app`.
- `mobile/npm run build:aab` completed successfully using the ignored release keystore/build.json.
  Copied the finished signed artifact to `D:\NutriScan-mainn\bitezsnap-release.aab`
  (6,547,334 bytes). SHA-256:
  `A44F30CB72C60DE22E8657F3E309FBD4B862EDA7FEFAFCFF38034721C1C6771C`.
- Offline Android bundletool manifest verification: package `com.bitezsnap.app`, versionName
  `1.0.0`, versionCode `10000`, min SDK 24, target/compile SDK 36, launcher activity
  `com.bitezsnap.app.MainActivity`, cleartext disabled, backups disabled. `jarsigner -verify`
  passed; upload certificate SHA-256 is
  `3C:AB:59:60:5C:8C:6D:43:D4:58:84:99:FE:6A:E7:B7:6F:E9:22:2D:64:49:AF:68:83:DA:6E:D6:5E:E8:4E:83`.
- Native Play Integrity tests passed (4/4). Remaining release configuration warning:
  `PlayIntegrityCloudProjectNumber` is still `0`; the real Google Cloud project number and the
  Play Console/RevenueCat configuration must match `com.bitezsnap.app` before production use.

## 2026-08-03 - Added public account-deletion page and canonical API endpoint
- Added the public SPA route `/delete-account`. It remains directly reachable without a session,
  so the deployed URL can be supplied to Google Play and opened or refreshed as a deep link.
- Changed the Profile "Delete Account" action to navigate to the new page instead of submitting
  deletion from the old inline confirmation dialog.
- Added an accessible account-deletion request flow with authenticated-account identification,
  a seven-day grace-period explanation, an acknowledgement checkbox, exact `DELETE` confirmation,
  actionable API errors, retention disclosures, and a scheduled-deletion success screen.
- Added canonical authenticated endpoint `POST /api/auth/account/deletion`. It schedules deletion,
  increments the token version, revokes every active session, clears auth cookies, and returns the
  deletion deadline. Repeated requests are idempotent and do not extend an existing deadline.
- Retained legacy `DELETE /api/auth/account` as a compatibility alias for older clients.
- Updated session restoration so `/delete-account`, privacy-policy, and reset-password public links
  are not redirected to login before their public content can render.
- Verification: frontend deletion-page tests passed (4/4), backend auth tests passed (30/30),
  targeted ESLint passed, `git diff --check` passed, and the Vite production build completed.
  `Frontend/dist/_redirects` contains the SPA fallback. The build retains the pre-existing large
  JavaScript chunk warning only.
- Deployment URL format: `https://<deployed-web-domain>/delete-account`.
- Current retention limitation is disclosed on the page: uploaded scan-image files may remain at
  the image host after the related application record is deleted, matching the existing policy.

## 2026-08-03 - Aligned deletion URL content with Google Play Console requirements
- Expanded the public `/delete-account` page to explicitly explain both supported request methods:
  the Android flow (`Profile` > `Account Actions` > `Delete Account`) and the authenticated web form.
- Added clear, separately labelled sections for when deletion occurs, which account-associated data
  is permanently deleted, which limited records may remain, and the applicable retention duration
  or condition for every retained category.
- The page now states that anonymised shared product facts can remain indefinitely without an
  account link; hosted image copies and remaining vote records can remain until support removes
  them; and payment/security/tax/legal records remain only for periods required by law or providers.
- Clarified that support is not required when a user can sign in, while keeping the support path for
  account-access problems and removal of retained image/vote records.
- UI follows the existing bitezsnap design system with responsive two-column instruction cards,
  semantic ordered/unordered lists, labelled controls, keyboard focus styling, and 44px+ actions.
- Verification: deletion-page tests passed (4/4), backend auth tests passed (30/30), targeted ESLint
  passed, `git diff --check` passed, and the Vite production build succeeded. The existing large
  JavaScript chunk warning remains non-blocking.

## 2026-08-04 - Added public registered-email account/data deletion request
- Replaced the sign-in-only `/delete-account` interaction with a prominent public form containing
  the exact `Registered Email Address` field, bold `Request Deletion` action, and permanent/30-day
  processing disclaimer requested for the Google Play Data Safety resource.
- Added public `POST /api/auth/account/deletion-request`. It validates and normalises the email,
  rate-limits requests, always returns the same message for registered/unregistered addresses, and
  emails a cryptographically random one-time verification link without exposing account existence.
- Added `POST /api/auth/account/deletion/confirm`. The emailed token is stored only as a SHA-256
  hash, expires after 24 hours, is single-use, and requires an explicit POST confirmation so email
  link scanners cannot schedule destructive work. Confirmation reuses the idempotent seven-day
  deletion scheduler, revokes all sessions, and clears browser auth credentials.
- Added startup-managed `users.deletion_request_token_hash` and
  `users.deletion_request_token_expires_at` columns plus the configurable
  `ACCOUNT_DELETION_REQUEST_RATE_LIMIT` (default 5 requests per 30 minutes).
- Added a Brevo account-deletion verification email containing the review link, seven-day grace
  period, 24-hour link expiry, permanent-action warning, and within-30-days processing promise.
- Closed prior associated-data purge gaps: expired-account cleanup now deletes each hosted
  Cloudinary scan image (and invalidates cached copies) before removing database rows, retries the
  scheduled account if the provider does not confirm deletion, and removes the deleted user's
  internal identifier from votes on other feature requests.
- Updated the Privacy Policy to document the public form, email verification, 30-day promise,
  Cloudinary deletion/retry behavior, and feature-vote identifier cleanup.
- Verification: backend auth + Cloudinary helpers passed 40/40 tests; deletion page + Privacy Policy
  passed 9/9 tests; targeted ESLint and Node syntax checks passed; `git diff --check` passed; Vite
  production build passed with only the existing large-chunk warning. Real Chrome QA at 390x844 and
  1440x900 confirmed direct public-route rendering, zero horizontal overflow, the form immediately
  after the hero, and a 48px Request Deletion action.
- Production requirement: set `FRONTEND_URL` to the deployed web origin and configure
  `BREVO_API_KEY` plus verified sender values so the 24-hour confirmation emails are delivered.

## 2026-08-04 - Fixed Render refresh 404s for BrowserRouter routes
- Confirmed the live `/dashboard` refresh failure occurs at Render's static hosting layer before
  React loads: nested paths were being looked up as files and returned `404 Not Found`.
- Enabled the existing `fitscore-6hqp` frontend static-site definition in the root `render.yaml`.
  It now publishes `Frontend/dist` and declares the required `/*` to `/index.html` rewrite, while
  leaving the browser URL unchanged so React Router can resolve `/dashboard`, `/delete-account`,
  and every other client route.
- Kept `Frontend/public/_redirects` as a portable build-output fallback and corrected its comment
  to identify `render.yaml` as the active Render configuration source.
- Verification: `npm run build` in `Frontend` completed successfully; the generated
  `Frontend/dist/_redirects` contains the SPA fallback. Render still needs the Blueprint synced
  (or the identical rule added under the existing site's Redirects/Rewrites tab) and redeployed
  before the currently hosted URL changes behavior.

## 2026-08-04 - Rebuilt signed Play Store AAB from current source
- Ran `mobile/npm run build:aab` with the Android SDK available outside the workspace sandbox and
  isolated Gradle/temp directories on drive D. The Cordova-mode Vite build succeeded, synced 17
  current web files into `mobile/www`, and the Cordova/Gradle release bundle completed successfully.
- Replaced the top-level upload artifact at `D:\NutriScan-mainn\bitezsnap-release.aab` with the
  fresh signed bundle (6,551,152 bytes). SHA-256:
  `11D9773105AE186994B039D1518BD815EE2E0790F244B8EE40DEBBB62DFDB82F`.
- Bundletool manifest verification passed: package `com.bitezsnap.app`, versionName `1.0.0`,
  versionCode `10000`, min SDK 24, target/compile SDK 36, launcher
  `com.bitezsnap.app.MainActivity`, CAMERA/INTERNET permissions present, cleartext disabled, and
  backups disabled. The embedded Cordova payload contains the latest public account-deletion route,
  registered-email form, and deletion-request endpoint.
- `jarsigner -verify -verbose -certs` passed. Upload certificate SHA-256 remains
  `3C:AB:59:60:5C:8C:6D:43:D4:58:84:99:FE:6A:E7:B7:6F:E9:22:2D:64:49:AF:68:83:DA:6E:D6:5E:E8:4E:83`.
- Native Play Integrity tests passed (4/4). Production warning remains: `mobile/config.xml` still
  sets `PlayIntegrityCloudProjectNumber` to `0`; configure the real Google Cloud project number in
  Play Console/source and rebuild before relying on standard Play Integrity requests in production.

## 2026-08-04 - Replaced Profile dark-mode switch with three-choice Theme selector
- Replaced the Profile account-section `Dark Mode` switch with a visible `Theme` setting and three
  icon-only choices in this order: device default (monitor), dark (moon), and light (sun).
- Wired the selector to the existing `useTheme().setMode` API. Device default clears the stored
  override and follows live `prefers-color-scheme` changes; explicit dark/light choices remain
  persisted under the existing `fitscan_theme` key.
- Added the reusable `ThemeModeSelector` component with 44px native buttons, translated ARIA labels
  and tooltips, `aria-pressed`, visible keyboard focus, and a check marker so selection is not
  communicated by colour alone. Added responsive, RTL-safe, light/dark token-based styling without
  reintroducing glow effects.
- Changed `theme_system` from generic `System` copy to localized `Device default` wording in all
  eight locale files.
- Verification: the focused ThemeToggle suite passed 18/18 tests; targeted source lint passed when
  excluding the repository's documented pre-existing Profile/Fast Refresh rule violations; normal
  Vite production build passed. The standard unscoped lint command still reports those baseline
  violations plus its existing missing Jest-global configuration.
- Rebuilt and signed the Cordova Play Store bundle so it includes the new Theme selector. Updated
  `D:\NutriScan-mainn\bitezsnap-release.aab` is 6,551,968 bytes; SHA-256:
  `38D098A15FA824D114947E6EFFADB888B4FE8CA719625407F91D84108225219F`.
  `jarsigner -verify` passed, and the embedded payload was checked for both the selector CSS and
  `Device default` copy. The existing non-fatal Vite large-chunk and Amazon SDK R8 warnings remain.

## 2026-08-04 - Removed Profile subscription action row
- Removed the `ProfileAction` in the Goals & Tracking section that rendered `Manage Subscription`
  for premium accounts and `Upgrade` for non-premium accounts. This removes the exact
  `.profile-menu-action[data-area="premium"]` button from the Profile menu for every account type.
- Left the separate subscription/paywall modal behavior unchanged; only the requested Profile menu
  row was removed. The two remaining health-setting rows close the responsive grid without an
  empty placeholder or spacing artifact.
- Verification: source audit found zero Profile premium action rows and the normal Vite production
  build passed. Rebuilt and signed the Cordova Play Store bundle; refreshed
  `D:\NutriScan-mainn\bitezsnap-release.aab` is 6,551,936 bytes with SHA-256
  `8F0D476D011EC8C4AE13AE174C91B841F14537F5C23A2CC973FD5637C1473B58`.
  `jarsigner -verify` passed. Existing non-fatal Vite large-chunk and Amazon SDK R8 warnings remain.

## 2026-08-10 - Built and verified Play Store AAB v1.0.1 (10001)
- Bumped the Cordova Android release from versionName `1.0.0` / versionCode `10000` to
  versionName `1.0.1` / versionCode `10001` in `mobile/config.xml`, and synchronized the
  mobile npm package/package-lock versions to `1.0.1`.
- Ran the four native Play Integrity tests successfully, rebuilt the current Vite SPA in Cordova
  mode, synchronized 17 web files, and completed the signed Cordova/Gradle release bundle build.
- Replaced `D:\NutriScan-mainn\bitezsnap-release.aab` with the new upload artifact (6,551,934
  bytes). SHA-256: `0E2FED7A1C8B9E388F82CE656A03278E3EC247913196655141ED7A3C6E9357A7`.
- Bundletool 1.18.0 validation passed. The final manifest reports package `com.bitezsnap.app`,
  versionName `1.0.1`, versionCode `10001`, min SDK 24, target/compile SDK 36, cleartext disabled,
  backups disabled, and only CAMERA/INTERNET/BILLING/ACCESS_NETWORK_STATE permissions.
- The bundle uses AGP 8.10.1 and declares `PAGE_ALIGNMENT_16K`; it contains zero native `.so`
  libraries. Bundletool successfully generated a universal APK, `apksigner` verified v2/v3
  signatures, and `zipalign -c -P 16` passed.
- The upload certificate is unchanged from the previous AAB: SHA-256
  `3C:AB:59:60:5C:8C:6D:43:D4:58:84:99:FE:6A:E7:B7:6F:E9:22:2D:64:49:AF:68:83:DA:6E:D6:5E:E8:4E:83`.
- External production configuration remains: `PlayIntegrityCloudProjectNumber` is still `0` in
  `mobile/config.xml`; the real Google Cloud project number is required for production Play
  Integrity requests, though this does not invalidate the AAB or block bundle upload validation.
