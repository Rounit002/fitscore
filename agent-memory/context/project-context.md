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