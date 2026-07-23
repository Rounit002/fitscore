# RevenueCat Subscription Integration Guide

A complete, reusable reference for adding **RevenueCat + Google Play Billing**
subscriptions to a **Cordova Android app + React (Vite) web frontend + Node/Express
backend** — exactly as it was implemented in Havenn.

Use this document as a checklist to replicate the same feature in another app.
Wherever you see `havenn` / `com.havenn.studyspace` / `libraries`, substitute your
own app name / package id / table name.

---

## 1. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cordova Android app (WebView)                                       │
│   cordova-plugin-purchases  →  window.Purchases (native bridge)      │
│                                                                       │
│   React frontend (same bundle is also deployed to the web):          │
│     revenueCatService.ts   → thin promise wrapper over the SDK       │
│     RevenueCatContext.tsx  → app-wide state (isPremium, offering…)   │
│     PaywallContent.tsx      → the paywall UI (plans, buy, restore)   │
│     Paywall.tsx             → global modal wrapper                    │
│     platformUtils.ts        → isCordova / isWeb detection            │
└─────────────────────────────────────────────────────────────────────┘
            │ purchase / restore happen 100% on-device via Google Play
            │ entitlement unlocks instantly via the SDK
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RevenueCat (source of truth for entitlements)                       │
│   - holds offerings/packages/products configured in the dashboard    │
│   - sends server-to-server webhooks on renew/cancel/expire           │
└─────────────────────────────────────────────────────────────────────┘
            │ (a) app calls POST /sync right after purchase
            │ (b) RevenueCat calls POST /webhook on lifecycle events
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Node/Express backend                                                │
│   routes/revenueCatSubscriptions.js                                  │
│     POST /api/subscriptions/revenuecat/sync     (owner-auth)         │
│     POST /api/subscriptions/revenuecat/webhook  (shared-secret)      │
│   → updates the `libraries` table so server feature-gating stays     │
│     in sync. RevenueCat REST API is the authority it reads from.     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key design decisions (worth copying)

- **RevenueCat only runs inside Cordova Android.** On the web build the SDK is never
  touched. Every public method in `revenueCatService.ts` is defensive so importing it
  on the web is safe and a no-op. Web users see a "subscribe in the app" message and
  their premium status is read from the backend flag instead.
- **Stable App User ID = `havenn_<libraryId>`.** Using a deterministic id (instead of
  RevenueCat's anonymous id) is what lets entitlements survive reinstall, restore, and
  multiple devices, and lets the backend map a webhook back to the right account.
- **Entitlement is the unlock signal.** The frontend reads
  `customerInfo.entitlements.active[ENTITLEMENT_ID]`. The backend mirror is a
  convenience for server-side gating, not the source of truth.
- **Two backend sync paths:** the app pings `/sync` for an instant unlock; the
  `/webhook` reconciles long-term lifecycle (renewals/cancellations/expirations).

---

## 2. Prerequisites (one-time setup in dashboards)

### Google Play Console
1. Create your app and upload at least an **internal testing** build (a signed AAB
   that already contains the `cordova-plugin-purchases` plugin).
2. Create a **subscription product** for each plan (e.g. `monthly_premium_tier_1`).
   Note each **Product ID** and its **base plan / offer** ids.
3. Add **license tester** Gmail accounts (so test purchases don't charge money).

### RevenueCat dashboard
1. Create a **Project** and add an **Android app**, linking it to your Play package
   name and the Play **service-account credentials** (so RevenueCat can validate
   purchases server-side).
2. **Products** → import/add the Google Play product ids from above.
3. **Entitlements** → create one entitlement (e.g. `premium`) and attach the products
   to it. *This identifier is what the code checks — keep it consistent.*
4. **Offerings** → create an offering (e.g. `default`) and add **packages**
   (Monthly / Annual / etc.), each pointing at a product. The app renders whatever is
   in the **current** offering dynamically — no client changes needed to add a plan.
5. **API keys** (Project settings → API keys):
   - **Android public SDK key** → starts with `goog_` (or `test_` for the Test Store).
     Goes in the **frontend**.
   - **Secret API key** (v1) → starts with `sk_`. Goes in the **backend** only.
6. **Integrations → Webhooks** → add your backend webhook URL and a custom
   **Authorization header** value (a shared secret).

---

## 3. Cordova plugin + config.xml

Install the RevenueCat Cordova plugin (it bundles Google Play Billing):

```bash
cd havenn          # the Cordova project directory
cordova plugin add cordova-plugin-purchases@^8.0.7
```

`havenn/config.xml` — the plugin and the app id:

```xml
<widget id="com.havenn.studyspace" version="1.0.2" android-versionCode="10003" ...>
  ...
  <plugin name="cordova-plugin-purchases" spec="^8.0.7" />
</widget>
```

> The plugin injects a global `window.Purchases` class **after** the `deviceready`
> event. Never assume it exists synchronously — always wait for `deviceready`
> (handled by `onCordovaReady()` below).

> **`window.cordova` is not reliable for platform detection** because `cordova.js`
> defines it asynchronously. We detect the app by **origin** instead (see
> `platformUtils.ts`): the bundled app shell is served from `https://localhost`
> (newer cordova-android) or `file://` (older), which the web build never uses.

---

## 4. Environment variables

### Frontend (`Frontend/.env`) — Vite, must be prefixed `VITE_`

```env
# RevenueCat Android PUBLIC SDK key ("goog_..." in prod, "test_..." for Test Store)
VITE_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxxxxxxxxxx

# Entitlement identifier — MUST match RevenueCat dashboard AND the backend
VITE_REVENUECAT_ENTITLEMENT_ID=premium

# Optional: force a specific offering id instead of the dashboard "current" one
VITE_REVENUECAT_OFFERING_ID=

# (Optional, only if you reference it in UI copy) Google Play product id
VITE_GOOGLE_PLAY_PRODUCT_ID=havenn_premium_monthly
```

> ⚠️ **Vite gotcha:** these must be written as the literal `import.meta.env.VITE_*`
> member expression. Vite statically replaces that exact pattern at build time.
> Wrapping it (e.g. `(import.meta as any)?.env?.VITE_*`) defeats the replacement and
> the value silently becomes `''` in the production bundle.

### Backend (`Backend/.env`)

```env
# RevenueCat SECRET API key ("sk_...") — used to read subscriber state via REST
REVENUECAT_SECRET_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxx

# Entitlement identifier — MUST match the frontend value
REVENUECAT_ENTITLEMENT_ID=premium

# The exact Authorization header value you set in the RevenueCat webhook config
REVENUECAT_WEBHOOK_AUTH_HEADER=supersecretwebhooktoken
```

---

## 5. Frontend implementation

Five files. Copy them and rename `havenn_` / branding as needed.

### 5.1 `src/utils/platformUtils.ts` — platform detection

Detects Cordova by **origin** (not `window.cordova`) and exposes
`isCordova`, `isWeb`, and `onCordovaReady(cb)` which fires on `deviceready` in the app
and immediately on web. The whole RevenueCat layer keys off `isCordova`.

```ts
// True when served from the local app shell (https://localhost or file://)
// AND the UA isn't a desktop browser.
export const isCordova: boolean = Boolean(isLocalAppShellOrigin() && notDesktopUA);
export const isWeb: boolean = !isCordova;

export function onCordovaReady(callback: () => void): void {
  if (isCordova && hasDOM) {
    document.addEventListener('deviceready', /* once */ callback, false);
  } else {
    queueMicrotask(callback);   // web: run immediately
  }
}
```

### 5.2 `src/services/revenueCatService.ts` — promise wrapper over the SDK

The Cordova plugin exposes callback-based static methods on `window.Purchases`. This
module:
- declares minimal TypeScript types for what we use (instead of the deprecated npm
  types),
- wraps every callback method in a Promise,
- is **safe to import on web** (every method early-returns when `!isCordova` or the
  plugin/key is missing).

Public surface:

| Function | Purpose |
|---|---|
| `isRevenueCatAvailable()` | `isCordova && window.Purchases && key set` |
| `buildAppUserId(libraryId)` | returns `havenn_<libraryId>` — the stable App User ID |
| `configure(appUserId?)` | configure SDK once (waits for `deviceready`); no-op on web |
| `logIn(appUserId)` / `logOut()` | identify / clear the user so entitlements follow them |
| `getOfferings()` | forced-id > current > first available offering |
| `purchasePackage(pkg)` | buy; rejects with `{ userCancelled, error }` |
| `restorePurchases()` | restore prior purchases |
| `getCustomerInfo()` | latest customer info |
| `hasPremiumEntitlement(info)` | `Boolean(info.entitlements.active[ENTITLEMENT_ID])` |
| `checkPremiumStatus()` | convenience: fetch + check |
| `addCustomerInfoUpdateListener(cb)` | real-time updates (renew/expire/restore) |

Configuration (env-driven, note the literal `import.meta.env` requirement):

```ts
const REVENUECAT_ANDROID_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || '';
export const ENTITLEMENT_ID = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium';
const FORCED_OFFERING_ID = import.meta.env.VITE_REVENUECAT_OFFERING_ID || '';
```

Configure once, after `deviceready`:

```ts
Purchases.setLogLevel(import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
Purchases.configureWith({ apiKey: REVENUECAT_ANDROID_API_KEY, appUserID: appUserId || null });
```

Real-time updates — the plugin fires a window event `onCustomerInfoUpdated`; we attach
**one** listener, re-fetch a normalized `CustomerInfo`, and fan out to subscribers:

```ts
window.addEventListener('onCustomerInfoUpdated', () => {
  getCustomerInfo().then(info => listeners.forEach(l => l(info))).catch(() => {});
});
```

### 5.3 `src/context/RevenueCatContext.tsx` — app-wide state

The provider owns the lifecycle and exposes everything the UI needs:

- On mount (Cordova only): builds the App User ID from the logged-in owner
  (`havenn_<libraryId>`), calls `configure()`, then `logIn()`, then fetches the initial
  entitlement + offerings.
- Subscribes to customer-info updates → flips `isPremium` in real time.
- `purchase(pkg)` / `restore()` never throw; they return a structured
  `{ success, userCancelled?, isPremium?, message? }` and call `syncBackend()` on success.
- `isPremium` is **combined**: entitlement on Cordova, backend flag on web:

```ts
const isPremium = useMemo(() => {
  if (isCordova) return rcPremium || Boolean(user?.is_subscription_active);
  return Boolean(user?.is_subscription_active);
}, [rcPremium, user?.is_subscription_active]);
```

- `syncBackend()` POSTs to `/subscriptions/revenuecat/sync` and dispatches a
  `subscription:updated` window event so the rest of the app refreshes session state.
- Also owns the global paywall modal: `isPaywallOpen`, `openPaywall()`, `closePaywall()`.

Exposed hooks: `useRevenueCat()` (full API) and `usePremium()` (`{ isPremium, isReady }`)
for feature gating.

### 5.4 `src/components/PaywallContent.tsx` — the paywall UI

Pure presentational; all logic comes from `useRevenueCat()`. It:
- renders **dynamic** packages from the current offering (title, localized
  `priceString`, billing period parsed from the ISO-8601 `subscriptionPeriod`, and any
  free-trial / intro pricing),
- pre-selects the Annual package (or first) and marks it **BEST VALUE**,
- handles **Subscribe** and **Restore** with loading + toast feedback,
- renders distinct states: already-premium, **web → "subscribe in the app"**, loading,
  error/empty (with Try Again + Restore),
- shows the required Google Play legal note (auto-renew / cancel anytime).

### 5.5 `src/components/Paywall.tsx` — global modal

A thin `Dialog` wrapper rendering `<PaywallContent compact onPremiumGranted={closePaywall} />`.
Rendered once at the app root; open it from anywhere via
`useRevenueCat().openPaywall()` (e.g. a navbar "Upgrade" button).

### 5.6 Wiring it up — `src/App.tsx`

`RevenueCatProvider` wraps the app (inside your auth provider, since it needs the
logged-in user), and `<Paywall />` is rendered once near the root:

```tsx
<AuthProvider>
  <RevenueCatProvider>
    <HashRouter>
      <AppRoutes />
      <Paywall />            {/* global modal, opened via openPaywall() */}
      <Toaster />
    </HashRouter>
  </RevenueCatProvider>
</AuthProvider>
```

On the subscription page, gate the paywall by platform:

```tsx
{isCordova && <PaywallContent onPremiumGranted={() => { /* refresh session */ }} />}
{isWeb && <div>Subscriptions are managed in the mobile app…</div>}
```

---

## 6. Backend implementation

### 6.1 `Backend/routes/revenueCatSubscriptions.js`

Exports `createRevenueCatRouter(pool)` with two routes. RevenueCat is the source of
truth; this keeps the `libraries` table in sync for server-side feature gating.

- **App User ID convention:** `havenn_<libraryId>`. `libraryIdFromAppUserId()` strips
  the `havenn_` prefix to recover the numeric id from any webhook/event.
- **`rcApiGet(path)`** — native `https` GET to `api.revenuecat.com` with
  `Authorization: Bearer <REVENUECAT_SECRET_API_KEY>` (no extra dependency).
- **`deriveSubscriptionState(subscriber)`** — reads
  `subscriber.entitlements[ENTITLEMENT_ID]`; active when present and not expired
  (or no expiry = lifetime). Returns `{ isActive, startDate, endDate, productId, status }`.

**`POST /sync`** (owner-authenticated) — called by the app right after purchase/restore:
```js
const appUserId = `havenn_${req.session.owner.id}`;
const data = await rcApiGet(`/v1/subscribers/${encodeURIComponent(appUserId)}`);
const state = deriveSubscriptionState(data?.subscriber || {});
await updateLibrarySubscription(libraryId, state);
req.session.owner.is_subscription_active = state.isActive;   // instant gating
return res.status(200).json({ success: true, isActive: state.isActive, endDate: state.endDate });
```
It always returns `200` even on error — the client already unlocked locally via the
entitlement.

**`POST /webhook`** (server-to-server) — configured in RevenueCat:
- validates `req.headers.authorization === REVENUECAT_WEBHOOK_AUTH_HEADER`,
- maps `event.app_user_id` → library id,
- prefers the authoritative subscriber record via `rcApiGet`, falling back to the
  event payload (`INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION`,
  `NON_RENEWING_PURCHASE` ⇒ active),
- **always returns `200`** so RevenueCat doesn't hammer retries.

`updateLibrarySubscription()` updates `is_subscription_active`, clears `is_trial` when
active, and `COALESCE`s plan/dates/product so a partial event never wipes good data.

### 6.2 Mount the router — `Backend/server.js`

```js
const { createRevenueCatRouter } = require('./routes/revenueCatSubscriptions');
app.use('/api/subscriptions/revenuecat', createRevenueCatRouter(pool));
```

> Ensure the webhook route can read a JSON body. If you use a raw-body verifier for
> other webhooks, make sure `express.json()` still applies here.

### 6.3 Database migration — `Backend/migrations/010_add_google_play_fields.sql`

Adds the store/columns the sync writes to (idempotent `IF NOT EXISTS`):

```sql
ALTER TABLE IF EXISTS libraries
  ADD COLUMN IF NOT EXISTS google_play_purchase_token  TEXT,
  ADD COLUMN IF NOT EXISTS google_play_product_id      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_play_subscription_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_libraries_google_play_purchase_token
  ON libraries(google_play_purchase_token);
```

Your base schema must also have the generic subscription columns the sync writes:
`is_subscription_active`, `is_trial`, `subscription_status`, `subscription_plan`,
`subscription_start_date`, `subscription_end_date`, `subscription_expires_at`
(the migration has a commented block to add the common ones if missing).

---

## 7. End-to-end flows

**Purchase (in app)**
1. User taps Subscribe → `RevenueCatContext.purchase(pkg)` → `Purchases.purchasePackage`.
2. Google Play sheet completes → SDK returns updated `CustomerInfo`.
3. `isPremium` flips locally from the active entitlement → UI unlocks instantly.
4. `syncBackend()` POSTs `/sync` → backend reads RevenueCat REST → updates DB + session.
5. `onCustomerInfoUpdated` keeps everything live for later renewals/expiries.

**Restore (new device / reinstall)**
1. User taps Restore → `Purchases.restorePurchases()`.
2. Because the App User ID is the deterministic `havenn_<libraryId>`, the prior
   entitlement returns and premium re-unlocks → `/sync` mirrors it to the DB.

**Lifecycle (renew / cancel / expire)**
1. RevenueCat POSTs `/webhook` with the shared Authorization header.
2. Backend recovers the library id, pulls the authoritative subscriber state, updates
   the DB. Web users then read the refreshed `is_subscription_active` flag.

---

## 8. Checklist — replicating this in another app

**Dashboards**
- [ ] Play Console: app + subscription product(s) + license testers + signed test build.
- [ ] RevenueCat: project + Android app linked to Play service account.
- [ ] RevenueCat: products → entitlement (pick an `ENTITLEMENT_ID`) → offering + packages.
- [ ] Copy the **Android public SDK key** (`goog_`/`test_`) and the **secret key** (`sk_`).
- [ ] Configure the webhook URL + Authorization header secret.

**Cordova**
- [ ] `cordova plugin add cordova-plugin-purchases@^8.0.7`.
- [ ] Set the real `<widget id>` package name in `config.xml`.

**Frontend**
- [ ] Copy `platformUtils.ts`, `revenueCatService.ts`, `RevenueCatContext.tsx`,
      `PaywallContent.tsx`, `Paywall.tsx`.
- [ ] Replace the App User ID prefix (`havenn_`) and `buildAppUserId()` to match your
      account/tenant id.
- [ ] Replace `PLAY_STORE_URL`, feature list, and branding/colors in `PaywallContent`.
- [ ] Set `.env`: `VITE_REVENUECAT_ANDROID_API_KEY`, `VITE_REVENUECAT_ENTITLEMENT_ID`
      (and optional offering/product ids).
- [ ] Wrap the app in `RevenueCatProvider` and render `<Paywall />` once at the root.

**Backend**
- [ ] Copy `routes/revenueCatSubscriptions.js`; adjust the table name and the auth
      middleware (`authenticateOwner`) and the `libraryId`/prefix logic.
- [ ] Mount it: `app.use('/api/subscriptions/revenuecat', createRevenueCatRouter(pool))`.
- [ ] Set `.env`: `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_ENTITLEMENT_ID`,
      `REVENUECAT_WEBHOOK_AUTH_HEADER`.
- [ ] Run the DB migration for the store columns + generic subscription columns.

**Test (with a license-tester account on a real device / internal track)**
- [ ] Offerings render with live prices in the app.
- [ ] Purchase unlocks premium instantly; DB row flips `is_subscription_active = true`.
- [ ] Kill + reopen and Restore on a fresh install → premium returns.
- [ ] Trigger a webhook (cancel in Play) → backend reconciles.
- [ ] Open the web build → "subscribe in the app" message; premium reflects after sync.

---

## 9. Gotchas / lessons learned

- **Keep `ENTITLEMENT_ID` identical** in the RevenueCat dashboard, frontend env, and
  backend env. A mismatch = "purchase succeeds but nothing unlocks."
- **Always write `import.meta.env.VITE_*` literally** (no `as any` wrapping) or Vite
  won't inline it and the value is empty in production.
- **Don't detect Cordova via `window.cordova`** — it's defined asynchronously. Detect
  by origin and wait for `deviceready`.
- **Use a deterministic App User ID**, never the anonymous one, or restore/multi-device
  won't tie back to the user and the backend can't map webhooks.
- **The webhook must always return `200`** (even on internal error) so RevenueCat
  doesn't retry-storm you.
- **Entitlement is the unlock authority**, the DB is a mirror. `/sync` gives the instant
  update; the webhook is the durable reconciler.
- **Web has no Billing.** Guard every SDK call with `isRevenueCatAvailable()` and show
  the "subscribe in the app" path on web.
- The bundled app shell is served from `https://localhost`; the public web build and
  Vite dev server have different origins, which is exactly how `isCordova` tells them
  apart.

---

## 10. File map (Havenn reference)

| Layer | File |
|---|---|
| Platform detect | `Frontend/src/utils/platformUtils.ts` |
| SDK wrapper | `Frontend/src/services/revenueCatService.ts` |
| App state/provider | `Frontend/src/context/RevenueCatContext.tsx` |
| Paywall UI | `Frontend/src/components/PaywallContent.tsx` |
| Paywall modal | `Frontend/src/components/Paywall.tsx` |
| Subscription page | `Frontend/src/pages/SubscriptionPlans.tsx` |
| App wiring | `Frontend/src/App.tsx` |
| Backend routes | `Backend/routes/revenueCatSubscriptions.js` |
| Router mount | `Backend/server.js` |
| DB migration | `Backend/migrations/010_add_google_play_fields.sql` |
| Cordova plugin | `havenn/config.xml` (`cordova-plugin-purchases`) |
</content>
</invoke>
