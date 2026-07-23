# Requirements: Free Scan Quota (5 Free Scans Before Subscription)

## Overview

All users on the `free` plan should be able to scan up to **5 products** (camera, gallery, and barcode combined) before being asked to subscribe. After 5 scans, the scanner page shows an inline upgrade banner instead of allowing more scans. Subscribed users (any non-free plan) have no scan restriction.

---

## Requirements

### REQ-1: Free plan scan limit is 5

- **WHEN** a new user registers, their `scan_limit` in the `users` table MUST be set to `5`.
- **WHEN** an existing free-plan user has `scan_limit > 5`, it MUST be updated to `5` via a one-time migration (the migration caps all free users, not just new ones).
- Subscribed users (plan = `basic`, `pro`, `premium`, `family`) keep their existing `scan_limit` unchanged.

### REQ-2: Free plan users can perform scans until the quota is reached

- **WHEN** a free-plan user attempts a photo scan (`POST /api/analyze/image`) or a text/barcode scan (`POST /api/analyze/text`), the backend MUST allow the request if `scans_used < scan_limit`.
- The `requirePlan` middleware that currently blocks all `free` plan users from `POST /api/analyze/image` MUST be removed. Access control is handled solely by `checkQuota`.
- `checkQuota` applies equally to both image and text analysis routes.

### REQ-3: Backend returns a clear quota-exceeded signal

- **WHEN** `scans_used >= scan_limit`, the backend MUST return HTTP `403` with body `{ "error": "quota_exceeded", "message": "..." }`.
- The `error` field value MUST be the string `"quota_exceeded"` (machine-readable, distinct from other 403 errors).

### REQ-4: Scanner page shows an inline upgrade banner when quota is exhausted

- **WHEN** the `ScanQuotaBar` reports `used >= limit`, the `Home` component MUST render an inline upgrade banner inside the scanner footer, replacing the normal action buttons.
- The banner MUST:
  - Display a clear message: e.g. "You've used all 5 free scans."
  - Include a prominent "Upgrade to Premium" call-to-action button.
  - The CTA button MUST navigate the user to the `/profile` page (where subscription management lives).
- The camera capture button, gallery button, and barcode button MUST be disabled (not hidden) when quota is depleted, so the UI degrades gracefully.
- The existing `quotaDepleted` toast ("Scan limit reached…") SHOULD be replaced by this banner; do not show both.

### REQ-5: App-level scan handlers surface quota errors as an upgrade prompt

- **WHEN** `analyzeFoodImage` or `analyzeFoodText` returns an error with message containing `"quota_exceeded"` or `"Scan limit reached"`, the `App.jsx` error handlers (`handleImageSelected`, `handleBarcodeScanned`, `handleDatabaseProductSelected`) MUST navigate to `/scan` and set an `info` message prompting upgrade (not an error toast), so the inline banner is visible.
- Generic errors (rate limit, network failure, etc.) continue to show the existing error toast.

### REQ-6: Quota bar accurately reflects the 5-scan free tier

- The `ScanQuotaBar` component reads from `GET /api/user/scan-quota`.
- That endpoint already returns `used`, `limit`, `plan`, and `remaining` — no change needed to the endpoint itself.
- The bar MUST display the correct remaining count once REQ-1's limit is applied.

### REQ-7: Scan count increments for both image and text scans

- Both `processImageAnalysis` and `processTextAnalysis` already increment `scans_used` after a successful AI call. This behavior MUST be preserved.
- No double-counting: the increment happens once per completed analysis, not at enqueue time.

---

## Out of Scope

- Payment/subscription flow changes — the CTA routes to `/profile` where existing subscription management already lives.
- RevenueCat integration changes.
- Admin or staff plan overrides.
- Resetting `scans_used` on a monthly cycle (future work).
