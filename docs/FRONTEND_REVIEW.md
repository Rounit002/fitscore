# NutriScan Frontend & UI/UX Review

Reviewed React 19 + Vite SPA: `src/App.jsx`, all components in `src/components/`, `src/geminiService.js`, `src/i18n/`, `src/index.css`, and `vite.config.js`. Grouped by severity.

---

## Critical (functional / UX-blocking)

- **No routing — everything is conditional rendering in `App.jsx`.**
  - `App.jsx` is **675 lines**, owns global view state via `currentView` strings (`'dashboard' | 'home' | 'results' | ...`), and re-renders the entire shell on every navigation.
  - Consequences: no URL deep-linking, no back button support (browser Back exits the app), no shareable links, no per-route code-splitting, no scroll restoration, broken refresh (always lands on Dashboard or Login). The `Home.jsx` "history" button even falls back to `window.location.hash = '#/history'` (`src/components/Home.jsx:129`) which leads nowhere.
  - **Fix**: adopt `react-router-dom` (or TanStack Router) and define routes for each screen. Wrap heavy screens with `React.lazy` + `Suspense` for code splitting.

- **`VITE_API_URL` fallback is hardcoded in 13 files** (`http://localhost:5000`). Forgetting the env var in prod silently routes all requests to localhost. Centralize once:
  ```js
  // src/api/client.js
  export const API = import.meta.env.VITE_API_URL;
  if (!API) throw new Error('VITE_API_URL is not set');
  ```
  Then use a thin `fetch` wrapper that injects `credentials: 'include'` and JSON headers.

- **No global data layer / caching.**
  - Every screen re-fetches `/auth/me`, `/scans`, `/api/user/scan-quota` on mount with `fetch + useEffect`. There is no React Query / SWR / context store. Switching between History → Dashboard → Trends refetches the same scans 3 times.
  - **Fix**: add TanStack Query (`@tanstack/react-query`) with sensible `staleTime`; or at minimum a single `UserContext` + `ScansContext`.

- **`alert()` and `window.location.reload()` in production code.**
  - `App.jsx:250` — welcome-back uses `alert()`.
  - `Home.jsx:230` — "reset" button reloads the entire page.
  - `Results.jsx:79,83` — `alert(t('result_downloaded'))` / `alert(t('sharing_failed'))`.
  - **Fix**: use the existing toast component (`scan-toast` is already styled) consistently. Replace reloads with state resets.

- **No `ErrorBoundary`.** A render error in `Dashboard.jsx` (1000 lines, lots of optional chaining) takes down the whole app to a white screen. Wrap `<App />` and each major route in error boundaries with a "Reload" fallback.

- **`StrictMode` + camera `getUserMedia` will request twice in dev** (`Home.jsx:25-48`). The cleanup is correct, but the double-prompt is bad UX in development and may briefly leak streams. Guard with a ref pattern or remove StrictMode while iterating on this screen.

- **Polling-based job status is exposed to the user.**
  - `geminiService.js:11-39` polls every 1.5s for up to 60s.
  - `LoadingState.jsx` shows a generic spinner — user has no idea if it's the 1st second or 50th. No "still analyzing…" copy, no progress hint, no cancel button.
  - **Fix**: pass elapsed time to the loading screen, show staged copy (`"Detecting product…" → "Analyzing ingredients…" → "Personalizing…"`), and offer Cancel after 20s.

- **Cookie/auth + page refresh = flash.**
  - `App.jsx` starts in `currentView='restoring'` and pings `/auth/me`. The splash is fine, but if the cookie is invalid you bounce to `'login'` after a network roundtrip — there's no skeleton, just an abrupt switch.
  - On Dashboard refresh, `localStorage.nutriscan_profile` (`App.jsx:189-194`) is hydrated optimistically but the parse is wrapped in a `try/catch` that swallows nothing useful. Use a typed parser and treat localStorage as cache, not source of truth.

---

## High-priority UX gaps

- **Accessibility (a11y) is thin.**
  - Plenty of icon-only buttons without `aria-label` (e.g. `Home.jsx:230,238` reset and search buttons, `Dashboard` chevrons, scan torch `Home.jsx:169-174`, header bell `App.jsx:140`).
  - No visible focus styles in custom CSS classes (`.fitscan-app-shell`, `.nf-input`); Tailwind's `focus:ring` is not applied to custom-styled inputs.
  - Color contrast: `#ADADAD` placeholder on `#fff` (Login) ≈ 2.6:1 — fails WCAG AA. `--ns-outline` used for "Loading NutriScan…" copy is grey-on-grey.
  - No `prefers-reduced-motion` handling despite heavy `framer-motion` and CSS keyframes. The score ring animation runs 1.4s with bouncy cubic-bezier (`Results.jsx:28`).
  - `<input type="range">` (zoom slider in `Home.jsx:184-192`) has no `aria-valuetext`.
  - No skip-link, no landmark roles beyond the implicit `<main>`/`<aside>`/`<nav>`.
  - **Fix**: pass an a11y lint pass (`eslint-plugin-jsx-a11y`), add focus-visible rings, add reduced-motion media query.

- **Internationalization is incomplete.**
  - Login (`Login.jsx`) is 100% hardcoded English — no `useTranslation`. Same for half of SignUp and the splash screen.
  - Error toasts mix raw strings: `App.jsx:362,423,478` — `"Analysis failed. Gemini might be busy. Try again!"`, `"Product scan failed. Try a photo instead!"`. These bypass i18n.
  - Date/number formatting is locale-naive; `toLocaleDateString()` is missing or hardcoded.
  - RTL is enabled via `document.documentElement.dir` (`App.jsx:160-178`) but many inline styles use directional values like `right: 14px`, `margin-left: 6px` (Login eye button, switch link). These must use `inset-inline-end` / logical properties.

- **Inline styles + giant injected `<style>` blocks.**
  - `Login.jsx` has a **383-line `<style>` tag** injected into every render (`Login.jsx:39-422`). Same pattern in SignUp and Onboarding.
  - Result: duplicate CSS on every mount, no caching, no theme support, no dark-mode for auth screens. The "auth page" background is hardcoded `#F5F5F5` — looks broken in dark theme.
  - **Fix**: move to CSS modules, a `.css` file per component, or Tailwind classes already imported.

- **`src/index.css` is 176 KB.**
  - That's huge for a Tailwind v4 project. Likely contains hand-written CSS plus full Tailwind output, instead of relying on the JIT compiler.
  - Verify `vite.config.js` Tailwind content paths so unused utilities are tree-shaken.
  - Consider splitting into theme tokens (`tokens.css`), components (`components/*.css` co-located), and Tailwind layers.

- **Dark mode is partial.**
  - `ThemeToggle.jsx` exists and `App.jsx` propagates `isDark`, but Login/SignUp/Onboarding ignore it. So the user toggles dark mode, logs out, and the next login page is white-on-white.
  - The theme also isn't applied during the `'restoring'` splash (background uses `var(--ns-surface)` but the inner SVG and gradient are hardcoded `#F25C28`/`#FF9500`).

- **Massive components hurt maintainability and bundle size.**
  - `Profile.jsx` — 43 KB (~1100 lines presumably).
  - `Dashboard.jsx` — 36 KB (996 lines).
  - `App.jsx` — 24 KB.
  - `Onboarding.jsx` — 22 KB.
  - Break into feature folders: `features/dashboard/{Dashboard,ScoreDial,MacroRow,BottomNav}.jsx`, `features/profile/{Profile,MedicalConditions,HealthGoals,Subscription}.jsx`.

- **Form UX issues.**
  - **Login**: no client-side validation beyond `required`. "Forgot your password?" button is a no-op (`Login.jsx:517`). Error states show raw server error strings (which may be English-only or "Invalid credentials" leaking). No password strength meter on SignUp. No caps-lock warning.
  - **Onboarding**: `AgePicker` is a scroll-wheel that does not work well with keyboard or screen readers — no `<input type="number">` fallback, no `aria-valuenow`. Touch users on Android may struggle with the snap behavior.
  - **Profile picture upload**: `auth.js` accepts up to 10 MB base64 strings. Frontend should compress (already done for scans in `Home.jsx:60-73`) — verify same is done in Profile.

- **Loading & empty states.**
  - History/Trends/FoodDatabase/Compare: I didn't see skeleton loaders — the screens flash empty until fetch returns. Add skeletons (Tailwind's `animate-pulse`) and explicit "No scans yet" empty states with CTA → Scan.

- **Error feedback inconsistent.**
  - Three styles: top-of-screen banner (`App.jsx:506-515`), inline red box (`Login.jsx`), `alert()` (Results). Pick one. The banner uses `bg-error/90` + `text-white` + uppercase + tracking-widest — distinctive but visually shouty.

- **Mobile shell missing.**
  - `App.jsx` renders `DesktopAppShell` for `lg:flex` and… there is no equivalent `MobileAppShell` wrapper. On mobile the sidebar is hidden via CSS but the top header is also `hidden lg:flex`. So mobile users get **no top header and no navigation** on most views — they depend on `Dashboard`'s `BottomNav` (which only exists in Dashboard). Switching to History from Dashboard works, but History has no bottom nav. The user is stranded with only an in-component "Back" button.
  - **Fix**: a single persistent mobile bottom nav, surfaced for every shell view.

- **Camera/scan screen issues.**
  - Torch toggle (`Home.jsx:169-174`) flips a state variable but never calls `track.applyConstraints({ advanced: [{ torch: true }] })` — **torch button does nothing**.
  - Zoom slider (`Home.jsx:184-192`) only CSS-scales the `<video>` element rather than using `track.applyConstraints({ zoom })`. Captured photo is full resolution regardless of zoom, so what the user "framed" isn't what they captured.
  - Capture button has no haptic/visual feedback on click beyond CSS hover.
  - No permission-denied recovery UI ("Open Settings to enable camera").

---

## Medium-priority

- **Image handling**
  - `Home.jsx` resizes to 1200px and JPEG-quality 0.85 — reasonable, but no EXIF orientation handling. Phone-portrait photos may upload sideways.
  - Base64 inline images shipped to server; consider direct Cloudinary signed upload from the browser to skip the 10 MB JSON roundtrip.

- **State leakage between users**
  - `localStorage.setItem('nutriscan_profile', ...)` is never namespaced by user id. If two users share a browser, profile B can briefly see profile A's data on first paint. Either key by user id or always clear on logout (which `handleLogout` does — but `handleLogin` overwrites unconditionally, which is fine).

- **`React.StrictMode` double-invoke** triggers double network calls in dev for every fetch effect. Wrap fetches in a "fired once" ref or migrate to React Query which dedupes automatically.

- **Magic number coupling**
  - `quotaLimit` defaults to 20 in `App.jsx:70` (free plan) and again in server `analyze.js`. Single source of truth via `/api/user/scan-quota` and remove the literal.

- **`fetch` everywhere with no abort signals.**
  - When the user navigates away mid-fetch, requests aren't cancelled. Use `AbortController` (or React Query, which handles it).

- **Bundle hygiene**
  - `@google/generative-ai` SDK is bundled to the client but unused (all Gemini calls are server-proxied). Removing it saves significant JS.
  - `html-to-image` and `html2canvas` both ship — Results uses `toPng` from `html-to-image`, so `html2canvas` is dead weight.
  - `recharts` is fine but heavy; consider `lightweight-charts` or pre-rendering trend SVGs server-side for the Dashboard sparkline.
  - `framer-motion` v12 — make sure tree-shaking actually works; the `motion` subset import is preferred.

- **Theme implementation**
  - `useTheme()` is imported from `./components/ThemeToggle` — odd location for a global hook. Move to `src/hooks/useTheme.js` and export a `<ThemeProvider>` instead of a side-effect singleton.

- **Lucide icon imports**
  - Each component imports a long list of icons from `lucide-react`. Lucide tree-shakes, but barrel imports can hurt cold dev builds. Consider `lucide-react/icons/<Name>` or an icon registry.

- **No analytics / observability**
  - No Sentry, no PostHog, no `console` filter. Hard to debug user-reported scan failures.

- **Onboarding back button** loops to `signup` if `pendingSignUp` is set, else `profile`, else logout (`App.jsx:541-550`). This works but a user signing up who hits Back exits the entire app — surprising. Show a confirm modal.

- **"Welcome back" deletion-cancelled `setTimeout(alert, 500)`** (`App.jsx:248-251`) — pops a modal 500 ms after dashboard load. Use an inline toast on the dashboard instead.

- **Title/meta tags**
  - `index.html` (344 bytes) is presumably minimal. Missing `<title>` per route, OG tags, theme-color, favicon variants, apple-touch-icon. PWA manifest absent — for a "scanner" app, installability is a big UX win.

- **No offline state.**
  - Service worker isn't configured. Users in poor connectivity (target market: India) will hit timeouts with no actionable feedback. Even a basic "You appear offline" banner using `navigator.onLine` would help.

- **Touch target sizes**
  - The `nf-eye-btn` (password reveal) is a 4-px-padded icon — < 44 px touch target. Same for header icon buttons.

- **Forms submit on Enter even with empty fields in some screens** — confirm every form uses `<button type="submit">` and disables it appropriately when invalid.

- **`window.scrollY` global listener** in `App.jsx:199-209` for header shadow is fine but should use IntersectionObserver for performance.

- **`page-transition` class is referenced** in nearly every screen but I didn't see the animation defined inline — confirm it's in `index.css` and respects `prefers-reduced-motion`.

---

## Low-priority polish

- **Brand inconsistency**: "FitScan", "NutriScan", "Nutri Scan" all appear across UI and prompts. Pick one and `find/replace`.
- **Hard-coded copyright year** in `Login.jsx:465` uses `new Date().getFullYear()` — good. But "All rights reserved" is English only.
- **`stray home_screen.html`** at repo root is referenced nowhere — delete.
- **`SignUp.css`** is 74 bytes — likely empty; consolidate into the SignUp component or delete.
- **Recharts default tooltip** is jarring; restyle to match the design system.
- **`canvas-confetti`** is imported but used where? If only for streak celebrations, ensure it's lazy-loaded.
- **Reset/Back/Close icons** use three different glyphs across screens (`ArrowLeft`, `ChevronLeft`, custom X). Standardize.
- **Score color thresholds duplicated** in `Results.jsx`, `Dashboard.jsx`, and probably `Trends.jsx`. Extract to `src/utils/scoreColor.js`.
- **`Results.jsx:13`** has `score >= 8 ? '#5BAD4E' : score >= 6 ? '#5BAD4E'` — same color twice for ≥8 and ≥6; probably a typo.
- **`parseVerdict`** in `Results.jsx:89-107` is doing fragile regex-based JSON repair on data the server should have sanitized. Move to server side.

---

## Recommended next steps (in order)

1. **Adopt `react-router-dom`** and replace the `currentView` switch in `App.jsx`. Add per-route code splitting.
2. **Add `@tanstack/react-query`** and a single `apiClient`. Remove the 31 hardcoded `VITE_API_URL || 'http://localhost:5000'` fallbacks.
3. **Add `ErrorBoundary`** at the app root and around each route; replace `alert()` and `window.location.reload()` with toasts/state.
4. **Decompose** `Dashboard.jsx`, `Profile.jsx`, `Onboarding.jsx`, `App.jsx` into feature folders.
5. **A11y sweep**: `eslint-plugin-jsx-a11y`, focus rings, aria-labels, `prefers-reduced-motion`, color contrast.
6. **Fix scanner**: actually apply torch/zoom constraints; show progress in `LoadingState`; handle EXIF orientation.
7. **i18n the auth screens** + every user-facing string in `App.jsx`'s error messages.
8. **Tailwind purge & dependency cleanup**: drop `@google/generative-ai`, `html2canvas`, audit `index.css`.
9. **Add PWA manifest + service worker** for installability and offline fallback.
10. **Build a `MobileAppShell`** mirror of `DesktopAppShell` so mobile users always have navigation.
