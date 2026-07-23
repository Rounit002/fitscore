# Design: Free Scan Quota (5 Free Scans Before Subscription)

## Overview

The free scan quota feature makes the NutriScan app accessible to unregistered-style (free plan) users by granting them 5 scans before any paywall interaction is required. The current system has a blocking bug: `POST /api/analyze/image` is protected by `requirePlan(['basic', 'pro', 'premium', 'family'])`, which means free users are rejected before quota logic even runs. Free users who try the camera scanner immediately see a 403 error despite never having used a scan.

This design fixes that bug, standardises the quota enforcement layer, and wires up a graceful upgrade experience in the frontend — an inline banner instead of a dead end.

### Goals

- Free plan users can perform up to 5 scans (camera + gallery + barcode combined) without upgrading.
- After 5 scans, the scanner page shows a clear, non-blocking upgrade banner rather than a confusing error.
- The quota signal from backend to frontend is machine-readable and unambiguous (`"quota_exceeded"` error code).
- Existing subscribed users are unaffected.

### Non-Goals

- Payment or subscription flow changes — CTA routes to `/profile`.
- RevenueCat integration changes.
- Monthly quota reset logic.
- Admin/staff plan overrides.

---

## Architecture

The feature touches three layers with a clear responsibility boundary:

```
┌─────────────────────────────────────────┐
│  Frontend (React/Vite)                  │
│                                         │
│  App.jsx          — quota error routing │
│  geminiService.js — quota signal parse  │
│  Home.jsx         — inline upgrade UI   │
│  ScanQuotaBar.jsx — quota display       │
└────────────────┬────────────────────────┘
                 │ HTTP (cookie auth)
┌────────────────▼────────────────────────┐
│  Backend (Express/Node)                 │
│                                         │
│  routes/analyze.js — checkQuota, routes │
│  routes/user.js    — scan-quota endpoint│
│  middleware/requirePlan.js — NOT used   │
│                       on /image anymore │
└────────────────┬────────────────────────┘
                 │ SQL (pg)
┌────────────────▼────────────────────────┐
│  PostgreSQL                             │
│                                         │
│  users.scan_limit   DEFAULT 5           │
│  users.scans_used   (existing column)   │
│  One-time migration to cap free users   │
└─────────────────────────────────────────┘
```

Data flow for a scan attempt:

```
User taps Capture
     │
     ▼
Home.jsx: quotaDepleted? ──yes──► Show banner, buttons disabled
     │ no
     ▼
analyzeFoodImage() in geminiService.js
     │
     ▼
POST /api/analyze/image
     │
     ├── authenticate middleware (JWT cookie)
     │
     ├── validateBody middleware
     │
     ├── checkQuota(pool, userId)
     │      scans_used >= scan_limit?
     │         yes ──► HTTP 403 { error: "quota_exceeded" }
     │         no  ──► continue
     │
     └── addAnalysisJob() → { id: jobId }
              │
              ▼
         pollJobStatus() → result
              │
              ▼
         App.jsx: navigate('/results')
```

---

## Components and Interfaces

### Backend: `checkQuota` (routes/analyze.js)

The existing `checkQuota` helper already has correct logic for computing the effective limit. The only required change is to the **error response shape**: the thrown object currently sets `quotaExceeded: true` on the response body, but the frontend needs to match on `err.error === "quota_exceeded"` (a stable string), not on a boolean field. The fix aligns the error field value to the string `"quota_exceeded"`.

Current response:
```json
{ "error": "<sentence>", "quotaExceeded": true, "plan": "free", "used": 5, "limit": 5 }
```

Required response:
```json
{ "error": "quota_exceeded", "message": "You've used all 5 free scans. Please upgrade to continue scanning.", "plan": "free", "used": 5, "limit": 5 }
```

The `error` field becomes the machine-readable code; `message` carries the human-readable sentence.

### Backend: `POST /api/analyze/image` route

Remove `requirePlan(['basic', 'pro', 'premium', 'family'])` from this route. The route handler already calls `checkQuota`, which handles free users correctly. The middleware was double-gating: plan check → quota check, but `requirePlan` fires first and rejects free users before quota is evaluated.

After fix, both `/image` and `/text` routes have identical access control: `authenticate` → `validateBody` → `checkQuota`.

### Backend: Database migration

A one-time SQL migration sets the `scan_limit` default to 5 and caps existing free users:

```sql
-- Set the column default for new users
ALTER TABLE users ALTER COLUMN scan_limit SET DEFAULT 5;

-- Cap all existing free users
UPDATE users SET scan_limit = 5 WHERE plan = 'free' AND scan_limit > 5;
```

Note: The Prisma schema currently shows `scanLimit Int @default(20)`. The schema default should be updated to `@default(5)` in sync with the migration.

### Backend: `GET /api/user/scan-quota` (routes/user.js)

No route-level change needed. The endpoint already applies `FREE_SCAN_LIMIT = 5` for free plan users regardless of the database `scan_limit` column value. This is correct and safe.

### Frontend: `geminiService.js`

The current quota error detection checks `err.quotaExceeded` (a boolean field):

```js
if (response.status === 403 && err.quotaExceeded) { ... }
```

After the backend change, the correct detection is:

```js
if (response.status === 403 && err.error === 'quota_exceeded') { ... }
```

The thrown `quotaError` propagated to `App.jsx` should carry `quotaError.isQuotaExceeded = true` (or keep using `quotaError.quotaExceeded = true` — the name just needs to be consistent between `geminiService.js` and `App.jsx`'s catch blocks).

### Frontend: `App.jsx` — scan error handlers

The three handlers (`handleImageSelected`, `handleBarcodeScanned`, `handleDatabaseProductSelected`) currently open the RevenueCat paywall on quota errors:

```js
if (err.quotaExceeded) {
  openPaywallRef.current?.();
  ...
  return;
}
```

The new behaviour: instead of opening the paywall overlay, navigate to `/scan` and set an `info` message so the inline `Home.jsx` banner is visible:

```js
if (err.quotaExceeded) {
  setInfo("You've used all 5 free scans. Upgrade to keep scanning!");
  navigate('/scan');
  setIsLoading(false);
  stopElapsedTimer();
  return;
}
```

This keeps the upgrade path in the scanner page itself where the user already is, rather than triggering a modal that may be unexpected at the end of a loading spinner.

### Frontend: `Home.jsx` — inline upgrade banner

The component already has the `quotaDepleted` state and renders a basic amber banner. The required changes:

1. The Upgrade button in the banner must navigate to `/profile` (not call `openPaywall()`). An `onNavigateProfile` prop already exists on `Home`.
2. The barcode button in the bottom grid must also be `disabled` when `quotaDepleted` (currently only the capture and gallery buttons are disabled).
3. Remove the toast-based quota message (or suppress it when the banner is shown) to avoid showing both at once.

### Frontend: `ScanQuotaBar.jsx`

No changes needed. The component correctly reads from `GET /api/user/scan-quota`, which already returns `limit: 5` for free users. Once the migration runs, existing free users' DB values will also be 5, making the two sources consistent.

---

## Data Models

### `users` table (PostgreSQL)

| Column | Type | Current default | New default | Notes |
|---|---|---|---|---|
| `scan_limit` | INTEGER | 20 | **5** | Migration caps free users |
| `scans_used` | INTEGER | 0 | 0 | No change |
| `plan` | VARCHAR | `'free'` | `'free'` | No change |
| `image_scans_used` | INTEGER | 0 | 0 | No change |

### Quota computation (both backend and frontend)

```
effective_limit = (plan === 'free') ? 5 : scan_limit
remaining       = max(0, effective_limit - scans_used)
quota_depleted  = scans_used >= effective_limit
```

This formula is already correct in `user.js` and `checkQuota`. The only delta is making `analyze.js`'s error response match the `quota_exceeded` string contract.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Quota-under-limit always permits the scan

*For any* user record where `scans_used < effective_limit` (where `effective_limit = 5` for free plan, `scan_limit` for paid), calling `checkQuota` MUST NOT throw — it must resolve and allow the request to proceed.

**Validates: Requirements 2.1**

### Property 2: Quota-at-or-over-limit always returns `quota_exceeded`

*For any* user record where `scans_used >= effective_limit`, calling `POST /api/analyze/image` or `POST /api/analyze/text` MUST return HTTP 403 with `response.body.error === "quota_exceeded"`.

**Validates: Requirements 3.1**

### Property 3: Quota error routing — only quota errors trigger the info path

*For any* error thrown by `analyzeFoodImage` or `analyzeFoodText`, if and only if the error has `quotaExceeded === true` (i.e. the backend returned `error: "quota_exceeded"`), then `App.jsx`'s handler MUST call `navigate('/scan')` and `setInfo(...)`. All other errors MUST set `error` state (toast) and NOT set `info`.

**Validates: Requirements 5.1**

### Property 4: Scan count increments by exactly 1 per completed analysis

*For any* initial `scans_used` value, after one completed call to `processImageAnalysis` or `processTextAnalysis`, the updated `scans_used` in the database MUST equal `initial_scans_used + 1` — not 0, not 2, not unchanged.

**Validates: Requirements 7.1**

### Property 5: Quota bar remaining count is always `max(0, limit - used)`

*For any* `(used, limit)` pair returned by `GET /api/user/scan-quota`, the `remaining` field MUST equal `Math.max(0, limit - used)`, and the bar percentage width MUST equal `Math.min(100, (remaining / limit) * 100)`.

**Validates: Requirements 6.1**

---

## Error Handling

### Backend error taxonomy for `/api/analyze/*`

| Condition | HTTP status | `error` field | Notes |
|---|---|---|---|
| No auth cookie / invalid JWT | 401 | `"Unauthorized"` | From `authenticate` middleware |
| Invalid request body | 400 | Zod validation message | From `validateBody` middleware |
| User not found | 404 | `"User not found"` | From `checkQuota` |
| Quota exceeded | **403** | **`"quota_exceeded"`** | Machine-readable code |
| Gemini rate-limited | 429 (proxied as 500) | Rate limit message | From `generateWithFallback` |
| Gemini unavailable | 500 | Model unavailability message | From `generateWithFallback` |
| Queue enqueue failure | 500 | `"Failed to queue scanning job."` | From `addAnalysisJob` |

The key invariant: **403 + `error === "quota_exceeded"` is the only case that triggers the upgrade path**. All other 403s (plan-gated endpoints elsewhere in the app) will have different `error` values and should not trigger the banner.

### Frontend error routing

```
analyzeFoodImage() throws
         │
         ├── err.name === 'AbortError'  → return silently (user cancelled)
         │
         ├── err.quotaExceeded === true → setInfo(...), navigate('/scan')
         │                                [banner visible on Home]
         │
         └── all others                → setError(message), navigate('/scan')
                                         [error toast]
```

### Migration safety

The database migration is non-destructive: it only lowers `scan_limit` for free users who already have `> 5`, and it only sets a new column default. It does not touch paid users or `scans_used`. The migration is safe to run on a live database with no downtime requirement.

---

## Testing Strategy

### Unit tests (Jest + Supertest — existing framework)

**Backend — `routes/analyze.test.js` additions:**

- Free user with `scans_used = 0` hitting `POST /api/analyze/image` → must NOT return 403 (verifies `requirePlan` removal)
- Free user with `scans_used = 5` hitting `POST /api/analyze/image` → must return `{ status: 403, body: { error: "quota_exceeded" } }`
- Free user with `scans_used = 5` hitting `POST /api/analyze/text` → same as above
- Paid user with `scans_used = 50, scan_limit = 100` → must queue successfully
- Expired paid plan auto-downgraded → free limit (5) applied

**Frontend — component tests (Vitest + React Testing Library, if configured):**

- `Home.jsx` with `quotaDepleted = true`: upgrade banner visible, scan buttons disabled
- `Home.jsx` with `quotaDepleted = false`: upgrade banner absent, scan buttons enabled
- CTA button in banner → calls `onNavigateProfile` (navigates to `/profile`)

### Property-based tests (fast-check — add as devDependency)

The project uses Jest. [fast-check](https://github.com/dubzzz/fast-check) integrates directly with Jest:

```bash
npm install --save-dev fast-check
```

Each property test runs a minimum of 100 iterations.

**Property 1 — Quota-under-limit allows scan:**
```
Feature: free-scan-quota, Property 1: quota-under-limit always permits the scan
```
Generate `(plan, scansUsed, scanLimit)` where `scansUsed < effectiveLimit`. Mock `pool.query` to return that row. Call `checkQuota(mockPool, userId)`. Assert it resolves without throwing.

**Property 2 — Quota-at-or-over-limit returns `quota_exceeded`:**
```
Feature: free-scan-quota, Property 2: quota-at-or-over-limit always returns quota_exceeded
```
Generate `(plan, scansUsed, scanLimit)` where `scansUsed >= effectiveLimit`. POST to `/api/analyze/image` and `/api/analyze/text` via Supertest. Assert `status === 403` and `body.error === "quota_exceeded"`.

**Property 3 — Error routing (quota vs non-quota):**
```
Feature: free-scan-quota, Property 3: only quota errors trigger info path
```
Generate error objects — some with `quotaExceeded: true`, others without. Call each App.jsx handler with the mocked `analyzeFoodImage`/`analyzeFoodText` throwing that error. Assert correct navigation and state-setter call.

**Property 4 — Scan count increments by exactly 1:**
```
Feature: free-scan-quota, Property 4: scan count increments by exactly 1 per analysis
```
Generate initial `scansUsed` from 0 to 4. Mock `pool.query` for the UPDATE call. Run `processImageAnalysis` / `processTextAnalysis`. Assert the UPDATE was called with `scans_used + 1`.

**Property 5 — Quota bar remaining count:**
```
Feature: free-scan-quota, Property 5: quota bar remaining is max(0, limit - used)
```
Generate `(used, limit)` integer pairs. Call the `GET /api/user/scan-quota` handler (or the pure computation). Assert `remaining === Math.max(0, limit - used)`.

### Integration / migration tests

- Seed free users with `scan_limit` values of 3, 5, 6, 10, 100. Run migration SQL. Assert all have `scan_limit = 5`. Paid users unchanged.
- New user insert → `scan_limit` defaults to 5.

### What is NOT property-tested

- The `ScanQuotaBar` UI rendering (snapshot test instead)
- The database migration (integration test with 2–3 examples)
- RevenueCat paywall integration (out of scope)
