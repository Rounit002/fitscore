# bitezsnap — Feature Reference

> App package: `com.havenn.studyspace` · Version: 1.0.2 · Platform: Web (Vite/React) + Android (Cordova)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Onboarding](#2-onboarding)
3. [Food Scanning](#3-food-scanning)
4. [AI Analysis Pipeline](#4-ai-analysis-pipeline)
5. [Results View](#5-results-view)
6. [Dashboard](#6-dashboard)
7. [Scan History](#7-scan-history)
8. [Food Database](#8-food-database)
9. [Product Comparison](#9-product-comparison)
10. [Trends & Health Progress](#10-trends--health-progress)
11. [Streak & Leaderboard](#11-streak--leaderboard)
12. [Profile & Settings](#12-profile--settings)
13. [Feature Requests Board](#13-feature-requests-board)
14. [Subscriptions & Billing](#14-subscriptions--billing)
15. [Internationalization](#15-internationalization)
16. [Mobile-Specific Features](#16-mobile-specific-features)
17. [Security](#17-security)

---

## 1. Authentication

| Feature | Detail |
|---------|--------|
| Email/password signup & login | bcrypt-hashed passwords |
| Google OAuth | `/auth/google` sign-in flow |
| Persistent sessions | HttpOnly JWT cookie, 30-day expiry |
| Session restoration | `/auth/me` re-hydrates state on page reload |
| Scheduled account deletion | 7-day grace period with countdown banner; login auto-cancels pending deletion |
| Cancel deletion | Dedicated endpoint to reverse a scheduled deletion |

---

## 2. Onboarding

A mandatory 7-step wizard that builds the user's health profile — this profile is injected into every AI analysis prompt.

| Step | Input |
|------|-------|
| 1. Age | Scroll-wheel picker (10–89) |
| 2. Height | Range slider + manual input (100–230 cm) |
| 3. Weight | Ruler slider with kg / lbs toggle (1–200) |
| 4. Gender | Female / Male / Other |
| 5. Date of Birth | Date picker |
| 6. Medical Conditions | Select from 70+ conditions (Diabetes, PCOS, GERD, Heart Disease, etc.) each with Low / Medium / High severity |
| 7. Health Goals | Select from 35 goals (Lose Weight, Build Muscle, Manage Blood Sugar, etc.) |

---

## 3. Food Scanning

Three entry points all feed the same AI analysis pipeline.

### 3a. Camera Scan
- Live camera preview with rule-of-thirds grid overlay and corner-bracket reticle
- Animated scanning beam
- Torch / flashlight toggle
- 1×–3× zoom slider (native camera zoom or CSS scale fallback)
- Camera reset button
- Optional voice-note / text field for adding context
- Falls back to `<input type=file capture=environment>` if the Camera API is unavailable

### 3b. Gallery Upload
- Pick any image from the device gallery
- Auto-downscales to 1200 px max dimension, JPEG 0.85 quality before upload

### 3c. Barcode Scanner
- Powered by **html5-qrcode** at 10 fps
- Looks up product data from the **Open Food Facts API**
- Feeds result into the same AI text-analysis flow

---

## 4. AI Analysis Pipeline

All AI calls are proxied through the backend so the Gemini API key is never shipped to clients.

### Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/analyze/image` | Image base64 → Gemini vision prompt |
| `POST /api/analyze/text` | Product JSON → Gemini text prompt |
| `GET /api/analyze/status/:jobId` | Poll for async job result |

### Processing Details
- Jobs are queued via **BullMQ-style async queue** (`config/queue.js` + `config/worker.js`); client polls until complete
- **Gemini model fallback chain:** `gemini-2.5-flash-lite` → `gemini-2.0-flash-lite` → `gemini-2.5-flash`
- After a 429 rate-limit response, a 60-second global cooldown prevents further quota burn
- **Translation cache:** text-scan results are cached in `product_database.translations` per language — a cache hit returns instantly without a Gemini call

### Scan Quota
| Plan | Limit |
|------|-------|
| Free | 20 scans total |
| Premium | Unlimited |

Quota is checked before every analysis. Expired premium plans are auto-downgraded to free.

---

## 5. Results View

Everything the AI returns, presented in one page.

| Element | Detail |
|---------|--------|
| Health Score | Circular SVG ring, 1–10, color-coded: green ≥ 8 / amber ≥ 5 / red < 5 |
| Verdict banner | Safe / Mostly Safe / Use Caution / High Risk / Avoid |
| Servings editor | Editable serving count scales all macros in real time; persisted via `PATCH /scans/:id/servings` |
| Nutrition macros | Calories, Protein, Carbs, Fat, Sodium per serving |
| Full Truth tab | 3–5 "Good: X" / "Bad: X" verdict bullets |
| Side Effects tab | 2–4 health risks specific to the user's medical profile |
| Ingredient Audit | Per-ingredient Beneficial / Harmful / Neutral rating with reasoning |
| Healthier Alternatives | 1–3 better product suggestions (India-specific) |
| Share | Renders summary card to PNG via `html-to-image`; uses Web Share API with file-download fallback |

All text is AI-translated into the user's chosen language at analysis time.

---

## 6. Dashboard

| Section | Detail |
|---------|--------|
| Welcome banner | Display name, streak flame counter, theme toggle |
| Quick actions | Scan Food + View History shortcuts |
| This Month | Total scan count for the current month |
| Week selector | 7-day calendar strip (prev/next week + month picker) with per-day scan count |
| Daily Nutrition Card | Circular calorie ring + Protein / Carb / Fat bar charts aggregated from all scans on the selected day |
| Recent Scans | Last 5 scans with product image, name, brand, health score badge, and 5-nutrient chip row (Cal, Protein, Carbs, Sodium, Fat); click to open full Results view |

---

## 7. Scan History

- Full chronological list of all the user's scans
- Search by product name, brand, or health score
- Score-color-coded entries with product thumbnail or fallback icon
- Click any entry to re-open the full Results view

---

## 8. Food Database

- Community database of products scanned across all users
- Hybrid search: local DB (flagged products) merged and deduplicated with **live Open Food Facts results** (up to 40 results)
- 650 ms debounced search input
- Each product shows image, name, brand, and latest health score ("WEB" for Open Food Facts results)
- Clicking any product runs the AI text-analysis flow on it

---

## 9. Product Comparison

- Select 2 or more previously scanned products
- Paginated, searchable card list for selection
- Comparison view shows: health score badge, Good/Bad verdict bullets, brand, product image, Safe/Risky label
- Horizontal swipe card layout

---

## 10. Trends & Health Progress

| Feature | Detail |
|---------|--------|
| Stats cards | Best day, worst day, overall trend, best healthy streak |
| Time range filter | Weekly (7d) / Monthly (30d) / Custom date range |
| Area chart | Daily average health score over time (Recharts) with custom tooltips and directional arrows on data points |
| Day drill-down | Click a data point → bottom sheet with that day's scan breakdown (good count, bad count, product list) |

---

## 11. Streak & Leaderboard

- Daily login streak tracking
- Point rewards: +5 pts per day logged in; −5 pts for a missed day
- Personal stats panel: streak days + total points
- Top-50 global leaderboard ranked by points (streak as tiebreaker), displaying the top 10 with the current user highlighted

---

## 12. Profile & Settings

All accessible from the profile menu:

| Screen | What you can do |
|--------|-----------------|
| Avatar | Upload profile photo (compressed to 320 px, stored in DB) |
| Personal Details | Inline-edit name, height, date of birth, weight, gender |
| Medical Profile | Update conditions and severity (searchable list of 70+) |
| Health Goals | Update goals (searchable list of 35) |
| Language | Switch between 8 languages (see §15) |
| Theme | Dark / Light toggle |
| Support | Opens mailto to `support@fitscan.app` |
| Premium section | Shows active plan; Razorpay payment flow for web users |
| Account Deletion | Schedule deletion (7-day grace) or cancel a pending deletion |
| Logout | Clears session cookie |

---

## 13. Feature Requests Board

A community-driven feature suggestion board built into the app.

| Feature | Detail |
|---------|--------|
| View requests | Status badges: Under Review / Planned / In Progress / Completed |
| Search | Filter by title or description |
| Filter tabs | All / Top Voted / New / Planned / Completed |
| Sort | Most Votes / Newest / Oldest |
| Vote | Up-vote or remove vote with optimistic UI |
| Submit | Title, category (Feature / UI / Performance / Bug / Other), description |

---

## 14. Subscriptions & Billing

### Plans

| Plan | Scans | Price |
|------|-------|-------|
| Free | 20 total | Free |
| Premium | Unlimited | ₹249 / month (web) or via Google Play (Android) |

A `ScanQuotaBar` component shows remaining scans with color-coded progress (green > 50 %, amber 20–50 %, red < 20 %) and the current plan badge.

### Payment Paths

#### RevenueCat — Primary (Android app)
- Plugin: `cordova-plugin-purchases` v8.0.7
- Entitlement ID: `premium`
- App User ID mapped to `nutriscan_<userId>`
- On purchase or restore: syncs to backend via `POST /api/subscriptions/revenuecat/sync`
- Backend re-fetches from RevenueCat REST API — never trusts client payload — and updates `is_premium`, `subscription_plan`, `subscription_expires_at`
- Webhook at `POST /api/subscriptions/revenuecat/webhook` handles renewals, cancellations, and expirations
- On web: shows "Subscribe in the Havenn app" message and a Play Store link

#### Razorpay — Web
- Flow: Profile screen → `loadRazorpayScript()` → `POST /api/payment/create-order` → Razorpay modal → `POST /api/payment/verify`
- Amount: ₹249 (2490 paise) for 30 days of Premium
- On verified payment: sets `is_premium = true`, extends `subscription_expires_at` by 30 days, resets `image_scans_used`

#### Legacy Google Play Billing (demoted)
- `POST /billing/validate` — validates purchase tokens via Google Play Developer API
- `POST /billing/webhook` — handles Pub/Sub RTDN events (renewal, cancel, expire)
- This path pre-dates RevenueCat and is no longer the primary mobile flow

---

## 15. Internationalization

8 supported languages with full UI translations:

| Language | RTL |
|----------|-----|
| English | No |
| Français | No |
| Deutsch | No |
| Español | No |
| हिन्दी | No |
| नेपाली | No |
| العربية | Yes |
| اردو | Yes |

AI analysis results are translated into the user's active language at query time via a language constraint in the Gemini prompt. Translations are cached per language per product in `product_database.translations`.

---

## 16. Mobile-Specific Features

The app ships as a Cordova Android wrapper (`com.havenn.studyspace`, v1.0.2, min SDK 23 / target SDK 36).

| Feature | Detail |
|---------|--------|
| Native camera | `cordova-plugin-camera` v8.0.0 with torch and zoom |
| File path resolution | `cordova-plugin-filepath` v1.6.0 |
| Runtime permissions | `cordova-plugin-android-permissions` v1.1.5 |
| In-app purchases | `cordova-plugin-purchases` v8.0.7 (RevenueCat) |
| Platform detection | Checks `protocol === 'file:'` or `https://localhost` + mobile UA — never uses `window.cordova` |
| Safe area padding | `safe-area-inset-bottom` for notched devices |
| Bottom navigation bar | `MobileBottomNav.jsx` on screens narrower than `lg` breakpoint |
| Web Share API | Used for sharing results; falls back to file download on desktop |
| Build pipeline | `cordova build android` + Gradle; release signed via `build.json` + `my-release-key.keystore` |

---

## 17. Security

| Mechanism | Detail |
|-----------|--------|
| JWT storage | HttpOnly, Secure, SameSite=Strict cookie — never accessible to JavaScript |
| Rate limiting | `authLimiter` on auth routes; `analyzeLimiter` on AI routes |
| Security headers | Helmet applied globally |
| Scan ownership | `requireOwnership` utility throws 403 on user_id mismatch |
| RevenueCat webhook | Guarded by a shared bearer token (`REVENUECAT_WEBHOOK_AUTH`) |
| Gemini API key | Lives on the backend only — never shipped to the client |
| Plan gating | `requirePlan` middleware checks plan level before allowing analyze routes |
| Subscription gating | `requireSubscription` middleware can gate any route behind active subscription status |
