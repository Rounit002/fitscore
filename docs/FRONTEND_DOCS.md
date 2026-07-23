# NutriScan — Frontend Documentation

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Entry Points](#entry-points)
4. [Routing & Navigation](#routing--navigation)
5. [Components](#components)
   - [App Shell & Layout](#app-shell--layout)
   - [Pages & Views](#pages--views)
   - [UI Components](#ui-components)
6. [Services & Utilities](#services--utilities)
7. [Internationalisation (i18n)](#internationalisation-i18n)
8. [Assets](#assets)
9. [State Management](#state-management)
10. [Auth Flow](#auth-flow)
11. [Scan Flow](#scan-flow)
12. [Theming & Dark Mode](#theming--dark-mode)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | ^19.2.5 | UI library |
| React DOM | ^19.2.5 | DOM renderer |
| React Router DOM | ^7.15.1 | Client-side routing |
| Vite | ^8.0.10 | Build tool & dev server |
| Tailwind CSS | ^4.2.4 | Utility-first CSS |
| Framer Motion | ^12.38.0 | Animations |
| Recharts | ^3.8.1 | Charts (Trends page) |
| Lucide React | ^1.9.0 | Icon library |
| i18next | ^26.1.0 | Internationalisation core |
| react-i18next | ^17.0.7 | React bindings for i18next |
| i18next-browser-languagedetector | ^8.2.1 | Auto language detection |
| html-to-image | ^1.11.13 | Screenshot / share feature |
| html5-qrcode | ^2.3.8 | Barcode / QR scanning |
| @react-oauth/google | ^0.13.5 | Google OAuth |
| @headlessui/react | ^2.2.10 | Accessible UI primitives |

---

## Project Structure

```
src/
├── api/
│   └── client.js               # Base API URL + apiFetch wrapper
├── assets/
│   ├── avatars/                 # boy.png, cap.png, girl.png
│   ├── nutrition/               # avocado.png, heart.png, scanner.png
│   ├── avatar-base.png
│   ├── hero.png
│   ├── login-bg.png
│   ├── login-hero.png
│   └── mascot.png
├── components/
│   ├── BarcodeScanner.jsx
│   ├── Compare.jsx
│   ├── Dashboard.jsx
│   ├── ErrorBoundary.jsx
│   ├── FeatureRequests.jsx
│   ├── FoodDatabase.jsx
│   ├── History.jsx
│   ├── Home.jsx
│   ├── LanguageSwitcher.jsx
│   ├── LoadingState.jsx
│   ├── Login.jsx
│   ├── MobileBottomNav.jsx
│   ├── Onboarding.jsx
│   ├── PaywallModal.jsx
│   ├── Profile.jsx
│   ├── Results.jsx
│   ├── ScanQuotaBar.jsx
│   ├── SignUp.jsx
│   ├── SignUp.css
│   ├── StreakLeaderboard.jsx
│   ├── ThemeToggle.jsx
│   └── Trends.jsx
├── i18n/
│   ├── index.js                 # i18next setup + language registration
│   └── locales/
│       ├── ar/translation.json
│       ├── de/translation.json
│       ├── en/translation.json
│       ├── es/translation.json
│       ├── fr/translation.json
│       ├── hi/translation.json
│       ├── ne/translation.json
│       └── ur/translation.json
├── services/
│   └── billingService.js        # Google Play / Cordova billing
├── utils/
│   ├── nutrition.js             # Nutriment parsing helpers
│   └── scoreColor.js           # Score → colour mapping
├── App.css
├── App.jsx                      # Root component + route definitions
├── geminiService.js             # AI scan calls (proxied via backend)
├── index.css
└── main.jsx                     # React DOM entry point
```

---

## Entry Points

### `src/main.jsx`

Bootstraps the React app. Wraps everything in `<StrictMode>`, `<BrowserRouter>`, and a top-level `<ErrorBoundary>`.

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
)
```

Also imports `./i18n/index.js` to initialise i18next before render.

### `src/App.jsx`

Root component. Owns all global state (auth, loading, analysis result) and defines every route.

---

## Routing & Navigation

All routes are defined in `App.jsx` using React Router v7.

### Route Map

| Path | Component | Protected |
|---|---|---|
| `/login` | `Login` | No (redirects to `/dashboard` if already logged in) |
| `/signup` | `SignUp` | No |
| `/onboarding` | `Onboarding` | No |
| `/dashboard` | `Dashboard` | Yes |
| `/scan` | `Home` | Yes |
| `/scan/barcode` | `BarcodeScanner` | Yes |
| `/history` | `History` | Yes |
| `/compare` | `Compare` | Yes |
| `/food-database` | `FoodDatabase` | Yes |
| `/trends` | `Trends` | Yes |
| `/leaderboard` | `StreakLeaderboard` | Yes |
| `/profile` | `Profile` | Yes |
| `/features` | `FeatureRequests` | Yes |
| `/results` | `Results` | Yes (requires `analysisResult` in state) |
| `/` | Redirects to `/dashboard` | — |
| `*` | Redirects to `/dashboard` | — |

Protected routes are nested under the `DesktopAppShell` layout route, which redirects to `/login` when `userAuth` is null.

### View Name ↔ URL Mapping

`App.jsx` maintains a `VIEW_TO_PATH` map used by the `handleNavigate(view)` helper, so all navigation calls use view name strings rather than raw paths.

```js
const VIEW_TO_PATH = {
  dashboard: '/dashboard',
  home: '/scan',
  barcode: '/scan/barcode',
  history: '/history',
  compare: '/compare',
  foodDatabase: '/food-database',
  trends: '/trends',
  streak: '/leaderboard',
  profile: '/profile',
  features: '/features',
  results: '/results',
};
```

---

## Components

### App Shell & Layout

#### `DesktopAppShell` (inside `App.jsx`)

A React Router layout route that renders the persistent sidebar (desktop) and top header. Uses `<Outlet />` for child pages.

**Responsibilities:**
- Redirects to `/login` when `userAuth` is null
- Shows user name, initials, plan type, and scan quota in the sidebar
- Renders the desktop sidebar navigation from `shellNavigation`
- Renders the mobile top header
- Wraps all child routes in `<ErrorBoundary>`
- Renders `<MobileBottomNav>` persistently at the bottom

**Props:**
| Prop | Type | Description |
|---|---|---|
| `userAuth` | object \| null | Authenticated user data |
| `userProfile` | object \| null | User profile data |
| `onNavigate` | function | Navigate by view name |
| `onLogout` | function | Logout handler |

---

#### `MobileBottomNav` — `src/components/MobileBottomNav.jsx`

Fixed bottom navigation bar, only visible on mobile (`lg:hidden`). Always rendered inside the app shell.

**Nav items:** Dashboard, History, Scan (elevated CTA), Trends, Profile

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onNavigate` | function | Navigate by view name |

Uses `useLocation()` to derive the active tab from the current URL.

---

#### `ErrorBoundary` — `src/components/ErrorBoundary.jsx`

Class component that catches uncaught render errors. Shows a "Something went wrong" fallback UI with a "Try again" button and a "Go to Dashboard" button.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `children` | ReactNode | Wrapped content |
| `fallback` | function | Optional custom fallback renderer `(error, reset) => ReactNode` |
| `onReset` | function | Called when "Try again" is clicked |

---

### Pages & Views

#### `Dashboard` — `src/components/Dashboard.jsx`

Main home page. Fetches all scans from the backend and displays a weekly/monthly nutrition overview.

**Features:**
- Greeting with user name and current streak
- Week selector with a 7-day slider and month picker
- Daily calorie ring (`ProgressRing`) with an animated gradient
- Macro bars for Protein, Carbs, and Fats (vs. profile goals)
- Quick action buttons: Scan, History, Trends, Food DB
- Recent scans list filtered by selected day
- Streak nudge card linking to the leaderboard

**Props:**
| Prop | Type | Description |
|---|---|---|
| `userAuth` | object | Authenticated user |
| `userProfile` | object | User profile (used for macro goals) |
| `authToken` | null | Legacy prop (unused, cookie auth) |
| `onNavigate` | function | Navigate by view name |
| `onViewDetail` | function | Called with a scan to navigate to `/results` |
| `isDark` | boolean | Current theme |
| `toggleTheme` | function | Toggle dark/light mode |
| `onLogout` | function | Logout handler |

---

#### `Home` — `src/components/Home.jsx`

The food scanner screen (`/scan`).

**Features:**
- Live camera preview using `getUserMedia` (environment facing)
- Torch toggle with `applyConstraints`
- Native zoom slider (CSS fallback if device API unsupported)
- Camera capture button
- Gallery / file upload button (auto-resizes image with `createImageBitmap` to max 1200px)
- Expandable note field (Mic icon)
- Barcode shortcut button → navigates to `/scan/barcode`
- `ScanQuotaBar` at the top of the footer — blocks scanning if quota is depleted
- Toast notifications for scan success / errors / quota reached

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onImageSelected` | function | Called with base64 JPEG when user captures / uploads |
| `onBack` | function | Navigate back |
| `onNavigateBarcode` | function | Navigate to barcode scanner |
| `onNavigateHistory` | function | Navigate to history |

---

#### `BarcodeScanner` — `src/components/BarcodeScanner.jsx`

Barcode / QR code scanner using `html5-qrcode`. Fetches product data from Open Food Facts and triggers the AI analysis flow.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onScan` | function | Called with decoded barcode string |
| `onBack` | function | Navigate back |

---

#### `Results` — `src/components/Results.jsx`

Displays the AI analysis result for a scanned product.

**Features:**
- Animated health score ring (`HealthRingLarge`)
- Verdict banner (Safe / Mostly Safe / Use Caution / High Risk / Avoid)
- Editable servings field (persists via `PATCH /scans/:id/servings`)
- Nutrition chips grid (Calories, Protein, Carbs, Sodium, Fats) — values scale with servings
- Share / download button using `html-to-image` (captures `.result-summary-card`)
- Tabbed view: "Full Truth" verdict items | "Side Effects"
- Verdict items with Good: / Bad: prefix colour coding
- Healthier Alternatives list
- Ingredient Audit sorted by impact (Beneficial → Harmful → Neutral)

**Props:**
| Prop | Type | Description |
|---|---|---|
| `result` | object | Full AI analysis result |
| `onBack` | function | Navigate back |
| `authToken` | null | Legacy prop |
| `onServingsChanged` | function | Called with `(scanId, newServings)` |

---

#### `History` — `src/components/History.jsx`

Full scan history list with search.

**Features:**
- Search by product name, brand, or score
- Product thumbnail (falls back to indicator icon)
- Score colour coding
- Click to view full analysis in Results

**Props:**
| Prop | Type | Description |
|---|---|---|
| `authToken` | null | Legacy prop |
| `onBack` | function | Navigate back |
| `onViewDetail` | function | Called with reconstructed result object |

---

#### `Compare` — `src/components/Compare.jsx`

Side-by-side product comparison tool.

**Features:**
- Lists scans from history with a search input and pagination (5 per page)
- Multi-select (tap to toggle)
- "Compare X choices" action bar appears after selecting ≥1 item, disabled until ≥2 selected
- Horizontally scrollable comparison cards showing score, key insights, verdict items

**Props:**
| Prop | Type | Description |
|---|---|---|
| `authToken` | null | Legacy prop |
| `onBack` | function | Navigate back |

---

#### `FoodDatabase` — `src/components/FoodDatabase.jsx`

Search and browse packaged food products. Products come from the backend (`GET /scans/database`), which aggregates community-scanned products and Open Food Facts data.

**Features:**
- Debounced search (650ms)
- Product cards with thumbnail, name, brand, and latest health score (or "WEB" badge for Open Food Facts results)
- Skeleton loading states
- Selecting a product triggers the full AI analysis flow via `onSelectProduct`

**Props:**
| Prop | Type | Description |
|---|---|---|
| `authToken` | null | Legacy prop |
| `onBack` | function | Navigate back |
| `onSelectProduct` | function | Called with product data to start analysis |

---

#### `Trends` — `src/components/Trends.jsx`

Health score trend charts over time.

**Features:**
- Area chart (Recharts) of daily average health scores
- Custom tooltip showing date, score, and good/bad scan counts
- Custom dot with up/down arrows indicating trend direction
- Filter: Weekly (7 days), Monthly (30 days), Custom date range
- Stat cards: Best Day, Worst Day, Overall Trend, Best Streak
- Tappable data points open a bottom sheet with per-scan detail for that day

**Props:**
| Prop | Type | Description |
|---|---|---|
| `authToken` | null | Legacy prop |
| `onNavigate` | function | Navigate by view name |

---

#### `StreakLeaderboard` — `src/components/StreakLeaderboard.jsx`

Displays the user's streak stats and a global top-10 leaderboard.

**Features:**
- Streak (days) and Points stat tiles
- Top-10 leaderboard list (fetched from `GET /auth/leaderboard`)
- Current user highlighted in the list
- Placeholder rows shown when fewer than 5 entries exist

**Props:**
| Prop | Type | Description |
|---|---|---|
| `userAuth` | object | Used for seed data and matching current user in list |
| `authToken` | null | Legacy prop |
| `onBack` | function | Navigate back |

---

#### `FeatureRequests` — `src/components/FeatureRequests.jsx`

Community feature request board.

**Features:**
- List features with upvote counts, status badges, and category tags
- Optimistic upvote / un-vote
- Search and filter tabs: All, Top Voted, New, Planned, Completed
- Sort dropdown: Most Votes, Newest, Oldest
- "New" button opens a bottom sheet form to submit a request
- Categories: Feature, UI, Performance, Bug, Other
- Status colours: Under Review (amber), Planned (blue), In Progress (orange), Completed (green)

**Props:**
| Prop | Type | Description |
|---|---|---|
| `userAuth` | object | Used for voter matching |
| `authToken` | null | Legacy prop |
| `onBack` | function | Navigate back |

---

#### `Profile` — `src/components/Profile.jsx`

User profile and settings screen. Also exports two sub-page components.

**Default export `Profile`:**
Renders a menu-style profile page with sections for account, personal details, health, preferences, and danger zone. Also handles Razorpay payment flow and account deletion scheduling.

**Named exports:**
- `PersonalDetailsPage` — Inline-edit form for name, height, date of birth, weight, gender
- `MedicalProfilePage` — Searchable multi-select for health conditions with severity levels (Low / Medium / High). Used both in Profile and embedded in Onboarding (step 6)
- `HealthGoalsPage` — Searchable multi-select from 35 health goals. Used both in Profile and embedded in Onboarding (step 7)

**Props (`Profile`):**
| Prop | Type | Description |
|---|---|---|
| `userProfile` | object | Current profile |
| `userAuth` | object | Auth data (plan status, email, etc.) |
| `authToken` | null | Legacy prop |
| `onBack` | function | Navigate back |
| `onDelete` | function | Called after account deletion |
| `onLogout` | function | Logout handler |
| `onDetailsSaved` | function | Called with updated user object after any save |
| `onNavigateFeatures` | function | Navigate to Feature Requests |
| `isDark` | boolean | Current theme |
| `toggleTheme` | function | Toggle dark/light mode |

---

#### `Login` — `src/components/Login.jsx`

Login form with a split-layout design (sidebar on desktop, full-width on mobile).

**Features:**
- Email + password form with show/hide toggle
- Displays backend error messages
- "Forgot password" button (UI only, no implementation)
- Split panel with FitScan feature highlights on the left (desktop only)

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onLogin` | function | Called with `(user, token, deletionCancelled)` on success |
| `onNavigateSignup` | function | Navigate to sign-up |

---

#### `SignUp` — `src/components/SignUp.jsx`

Registration form. Does NOT call the API directly — defers to `onSignUpPending` which passes credentials to the Onboarding flow, where the account is created after profile setup.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onLogin` | function | Called after account creation completes in Onboarding |
| `onNavigateLogin` | function | Navigate to login |
| `onSignUpPending` | function | Called with `{ type, name, email, password }` |

---

#### `Onboarding` — `src/components/Onboarding.jsx`

7-step onboarding wizard run both for new signups and to collect profile data.

**Steps:**
1. Age — Scroll-wheel picker (`AgePicker`)
2. Height — Range slider with circle display (`HeightPicker`)
3. Weight — Horizontal ruler slider with kg/lbs toggle (`WeightPicker`)
4. Gender — Card selection (`GenderPicker`)
5. Date of Birth — Native date input (`DateOfBirthPicker`)
6. Medical Conditions — `MedicalProfilePage` (isOnboarding mode)
7. Health Goals — `HealthGoalsPage` (isOnboarding mode) + triggers account creation

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onComplete` | function | Called with final profile when editing existing profile |
| `initialProfile` | object \| null | Pre-filled profile data |
| `authToken` | null | Legacy prop |
| `onBack` | function | Called on back from step 1 |
| `pendingSignUp` | object \| null | Sign-up credentials from `SignUp.jsx` |
| `onLogin` | function | Called after successful account creation |

---

### UI Components

#### `LoadingState` — `src/components/LoadingState.jsx`

Full-screen overlay shown while an AI scan is in progress. Driven by an elapsed seconds counter passed from `App.jsx`.

**Features:**
- Animated icon that changes as steps progress (OCR → Profile Matching → Health Impact → Verdict)
- Step list with progress bars and completion checkmarks
- Elapsed time badge
- Contextual hint text that changes over time
- Cancel button appears after 10 seconds

**Props:**
| Prop | Type | Description |
|---|---|---|
| `elapsedSeconds` | number | Seconds elapsed (controlled externally) |
| `onCancel` | function | Called when user taps Cancel |

Step thresholds: Step 0 at 0s, Step 1 at 12s, Step 2 at 28s, Step 3 at 44s.

---

#### `ScanQuotaBar` — `src/components/ScanQuotaBar.jsx`

Displays remaining scan quota as a progress bar. Used inside `Home.jsx`.

**Features:**
- Fetches from `GET /api/user/scan-quota`
- Green bar > 50%, Amber 20–50%, Red < 20%
- Warning pulse animation when critically low
- Returns `null` on 401 or missing data (invisible)

**Props:**
| Prop | Type | Description |
|---|---|---|
| `onQuotaChecked` | function | Called with quota data `{ used, limit, plan }` |
| `refreshTrigger` | any | Changing this value triggers a re-fetch |

---

#### `ThemeToggle` — `src/components/ThemeToggle.jsx`

Icon button that toggles dark/light mode. Exports both the component and a `useTheme` hook.

**`useTheme()` hook:**
- Reads initial theme from `localStorage` → system preference → light
- Applies/removes `.dark` class on `<html>`
- Listens to system `prefers-color-scheme` changes (overridden by explicit user choice)
- Stores choice in `localStorage` under key `fitscan_theme`

**Returns:** `{ isDark: boolean, toggle: () => void }`

**`ThemeToggle` props:**
| Prop | Type | Description |
|---|---|---|
| `isDark` | boolean | Current theme state |
| `onToggle` | function | Toggle callback |
| `className` | string | Optional extra class |

---

#### `LanguageSwitcher` — `src/components/LanguageSwitcher.jsx`

Dropdown to switch the UI language. Supports RTL languages (Arabic, Urdu) by updating `document.documentElement.dir`.

**Supported languages:** English, Français, عربي, اردو, नेपाली, हिन्दी, Deutsch, Español

**Behaviour:**
- Persists choice to `localStorage` under `fitscan_language`
- Closes on outside click

---

#### `PaywallModal` — `src/components/PaywallModal.jsx`

Modal for upgrading to Pro. Shows Monthly ($4.99/mo) and Annual ($49.99/yr) plans with feature lists.

**Uses:** `billingService.js` for purchase flow (Cordova only).

**Props:**
| Prop | Type | Description |
|---|---|---|
| `isOpen` | boolean | Controls visibility |
| `onClose` | function | Close handler |
| `onSubscribed` | function | Called on successful purchase |

---

## Services & Utilities

### `src/api/client.js`

```js
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiFetch(path, options = {}) {
  // Wraps fetch with credentials: 'include' and JSON content type
}
```

All API calls use `credentials: 'include'` so the HttpOnly session cookie is sent automatically.

---

### `src/geminiService.js`

Proxies AI analysis requests through the backend (keeps the Gemini API key server-side).

**Exports:**
- `analyzeFoodImage(imageBase64, userProfile, signal)` — POSTs to `POST /api/analyze/image`, receives a job ID, then polls `GET /api/analyze/status/:id` every 1.5s until completed or failed (40 attempts max / ~60s timeout)
- `analyzeFoodText(productData, userProfile, signal)` — Same flow via `POST /api/analyze/text`

Both functions pass the current language via the `Accept-Language` header.

---

### `src/services/billingService.js`

Google Play billing via `cordova-plugin-purchase` (CdvPurchase). Only active when `window.cordova` is defined (i.e., running inside a Cordova/Capacitor wrapper).

**Exports:**
| Function | Description |
|---|---|
| `initBilling()` | Register products and initialise the store. Must be called after `deviceready`. |
| `purchaseSubscription(productId)` | Trigger a purchase flow for a given product ID |
| `restorePurchases()` | Restore previous purchases (for reinstalls / new devices) |
| `getProductInfo(productId)` | Return price, title, description for a product |
| `onSubscriptionActive(callback)` | Register a callback called with `(userId, expiryDate)` |
| `hasActiveSubscription()` | Check local receipt cache |
| `PRODUCT_IDS` | `{ MONTHLY: 'fitscan_pro_monthly', ANNUAL: 'fitscan_pro_annual' }` |

The validator URL is set to `${VITE_API_BASE_URL}/billing/validate`.

---

### `src/utils/nutrition.js`

Helpers for extracting and normalising nutriment data from scan objects. Handles the many different key naming conventions returned by Open Food Facts and the AI.

**Exports:**
| Function | Description |
|---|---|
| `safeJsonValue(value, fallback)` | Parse a JSON string safely, returning fallback on failure |
| `getProductData(item)` | Extract product data object from a scan, trying multiple key names |
| `getNutriments(item)` | Extract nutriments object from a scan |
| `parseServingGrams(item)` | Determine serving size in grams from serving_quantity or serving_size text |
| `getServingNutrition(item, servings)` | Return `{ calories, protein, carbs, sodium, fats }` scaled by servings |
| `getNutritionChips(item, servings)` | Return an array of `{ key, icon, label, value }` for the UI chips |

---

### `src/utils/scoreColor.js`

Single source of truth for health score colours.

**Score scale:** 0–10 (higher = healthier)

| Score | Label | Hex |
|---|---|---|
| ≥ 8 | Great | `#5BAD4E` |
| ≥ 6 | Good | `#8BC34A` |
| ≥ 4 | Caution | `#FF9500` |
| ≥ 2 | Risk | `#F25C28` |
| < 2 | Avoid | `#EF4444` |

**Exports:**
| Function | Description |
|---|---|
| `scoreColor(score)` | Returns hex string for score |
| `scoreBg(score)` | Returns `{ bg, border }` rgba strings |
| `scoreVerdict(score, t, icons)` | Returns full verdict object for `Results.jsx` |

---

## Internationalisation (i18n)

### Setup — `src/i18n/index.js`

Uses `i18next` + `react-i18next` + `i18next-browser-languagedetector`.

**Supported languages:**

| Code | Language |
|---|---|
| `en` | English (default) |
| `ar` | Arabic (RTL) |
| `fr` | French |
| `ur` | Urdu (RTL) |
| `ne` | Nepali |
| `hi` | Hindi |
| `de` | German |
| `es` | Spanish |

Language preference is stored in `localStorage` under `fitscan_language`. RTL languages (`ar`, `ur`) trigger `document.documentElement.dir = 'rtl'` and add the `.rtl` class, handled in `App.jsx`'s `languageChanged` event listener.

---

## Assets

### `public/`
| File | Description |
|---|---|
| `favicon.svg` | Browser tab icon |
| `icons.svg` | PWA icon sheet |
| `signup_food.png` | Sign-up page illustration |
| `_headers` | Cloudflare Pages HTTP headers config |

### `src/assets/`
| File | Description |
|---|---|
| `hero.png` | Landing page hero |
| `login-bg.png` | Login background |
| `login-hero.png` | Login illustration |
| `mascot.png` | App mascot |
| `avatar-base.png` | Default avatar placeholder |
| `avatars/boy.png` | Avatar option |
| `avatars/cap.png` | Avatar option |
| `avatars/girl.png` | Avatar option |
| `nutrition/avocado.png` | Nutrition illustration |
| `nutrition/heart.png` | Nutrition illustration |
| `nutrition/scanner.png` | Nutrition illustration |

---

## State Management

There is no external state management library. All state lives in React's built-in hooks.

### Global State (in `App.jsx`)

| State | Type | Description |
|---|---|---|
| `userAuth` | object \| null | Authenticated user (name, email, isPremium, streak, etc.) |
| `userProfile` | object \| null | Profile (height, weight, goals, conditions, etc.) |
| `analysisResult` | object \| null | Current AI scan result passed to `Results` |
| `isLoading` | boolean | Global AI scan in progress overlay |
| `elapsedSeconds` | number | Elapsed scan time driving `LoadingState` |
| `isRestoring` | boolean | True while session cookie is being validated (splash screen) |
| `error` | string \| null | Global error toast message |
| `info` | string \| null | Global info/success toast message |
| `pendingSignUp` | object \| null | Credentials held between SignUp and Onboarding |

### Persistence

- `localStorage.nutriscan_auth` — Serialised `userAuth` object (used to skip splash on return visits)
- `localStorage.nutriscan_profile` — Serialised `userProfile` object
- `localStorage.fitscan_theme` — `'light'` or `'dark'`
- `localStorage.fitscan_language` — Language code

---

## Auth Flow

```
App mount
  └─ Has nutriscan_auth in localStorage?
       ├─ YES → setIsRestoring(false), render app immediately
       │         then call GET /auth/me in background to refresh state
       └─ NO  → setIsRestoring(true), show splash spinner
                 call GET /auth/me
                   ├─ 200 OK → set state, navigate to /dashboard or /onboarding
                   └─ Error  → clear localStorage, navigate to /login
```

Session is maintained via an **HttpOnly cookie** (`nutriscan_session`). The `authToken` state is always `null` — it exists only as a legacy prop signature for child components.

---

## Scan Flow

```
User taps Capture / Upload / Barcode / Select from DB
  └─ App.jsx handler (handleImageSelected / handleBarcodeScanned / handleDatabaseProductSelected)
       ├─ Creates AbortController
       ├─ Sets isLoading = true, starts elapsed timer
       ├─ Calls geminiService.analyzeFoodImage|Text (proxied through backend)
       │     └─ Backend queues job → geminiService polls status endpoint
       ├─ On success:
       │     ├─ setAnalysisResult(result)
       │     ├─ navigate('/results')
       │     └─ saveScan() → POST /scans
       └─ On error:
             ├─ setError(message)
             └─ navigate back to scan/origin page
```

---

## Theming & Dark Mode

- Dark mode applied via the `.dark` class on `<html>` (Tailwind `darkMode: 'class'` strategy)
- CSS custom properties (e.g. `--ns-surface`, `--ns-primary`) are defined in `src/index.css` and change value under `.dark`
- User preference stored in `localStorage.fitscan_theme`
- System preference change is detected via `window.matchMedia('(prefers-color-scheme: dark)')` but only applied if the user has not made an explicit choice
- `useTheme()` hook in `ThemeToggle.jsx` is the single source of truth; the returned `{ isDark, toggle }` is lifted to `App.jsx` and passed down as props to components that need it (`Dashboard`, `Profile`)
