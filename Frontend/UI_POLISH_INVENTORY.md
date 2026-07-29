# Phase 2 — Inventory & Builder Lanes

Companion to `DESIGN_TOKENS.md`. Everything below was read, not assumed.

## 1. The structural fact that determines how this pass is executed

The app styles itself two different ways, and a builder must know which one applies
before touching a file:

| Styling system | Files | How the pass is applied |
| --- | --- | --- |
| **Semantic CSS classes** in `tailwind.css` | `Profile` (`profile-`, `personal-detail(s)-`, `medical-`, `health-goals-`, `delete-confirm-`, `deletion-banner-`), `Results` (`result-`, `servings-`), `Trends` (`trends-`, `stat-card-*`, `range-tabs`, `graph-*`, `sheet-*`), `History` (`history-`), `FoodDatabase` (`food-db-`), `StreakLeaderboard` (`streak-`, `leaderboard-`), `FeatureRequests` (`fr-`, `vote-btn`, `badge-*`, `category-chips`, `submit-btn`), `BarcodeScanner` (`barcode-`), `Compare` picker (`compare-`) | Edit the **CSS rule**, not the JSX. One rule change fixes every instance. |
| **Tailwind utilities in JSX** | `Dashboard`, `Home`, `MobileBottomNav`, `Login`, `SignUp`, `PaywallContent`, `PaywallModal`, `Paywall`, `ScanQuotaBar`, `LanguageSwitcher`, `Compare` comparison view | Edit `className` values in JSX. |
| **Inline style objects / component `<style>` blocks** | `Onboarding` (inline + `.nf-ob-*` + `!important` overrides of `.medical-*`/`.health-goals-*`), `ErrorBoundary` (100% inline) | Token cannot reach these. Convert the specific values to token-backed classes, or leave and flag. |

Consequence: most of this pass lands in `tailwind.css`, not in JSX. That is also why
finding #1 in the brief is real — the three inconsistent treatments come from CSS rules
written at different times, plus three late `!important` override blocks.

### 1.1 Override blocks that silently win

Three late blocks in `tailwind.css` re-declare every shell to
`border: 1px solid var(--ns-border-light) !important; box-shadow: var(--shadow-card) !important`.
So the `2px` shell borders written earlier (`profile-phone-shell`, `personal-details-shell`,
`medical-profile-shell`, `health-goals-shell`, `history-phone-shell`, `streak-phone-shell`,
`food-db-shell`, `compare-shell`) are **hairline at runtime**. Any builder editing the
earlier rule and not the override will see no change and must not "fix" it by adding more
`!important`.

## 2. Flat instance inventory with current edge treatment

Grouped by element type across the whole app, per the brief. "Current" is the treatment
that actually renders.

### 2.1 Primary buttons — colored fill, **no edge** (the single biggest violation)

`.profile-upgrade-button`, `.medical-save-button`, `.health-goals-save-button`,
`.result-primary-button.btn-primary`, `.compare-action-bar button` (`border: 0`),
`.fr-new-btn`, `.submit-btn`, `.fr-empty-btn`, `.nf-ob-next-btn`,
`.deletion-banner-cancel`, `.delete-confirm-destroy`, `.bottom-nav-scan-btn`,
`.fitscan-nav-scan`, Login submit, SignUp submit, PaywallContent Subscribe,
PaywallModal "Subscribe Now", ErrorBoundary "Go to Dashboard", Dashboard "Scan Food",
Dashboard "Scan Now", `BmiCard` "Update", MobileBottomNav FAB.

→ All become `.edge-highlight` where they are *the* primary action on their screen,
otherwise `.edge-hairline`. Note only one `.edge-highlight` per screen is allowed, so
screens with several filled buttons (Profile, FeatureRequests) get one highlight and the
rest hairline.

### 2.2 Secondary / ghost buttons — mostly hairline already, keep

`.profile-menu-action` (1.5px), `.profile-theme-toggle` (1.5px), `.food-db-card` (1.5px),
`.history-entry-card` (1.5px), `.compare-product-card` (1px), `.leaderboard-row` (1px),
`.fr-card` (1px), `.vote-btn` (1.5px), `.fitscan-week-strip button` (1.5px),
`.health-goals-list button` (1.5px), `.medical-issue-item` (1.5px),
Dashboard "View History" / Explore tiles / RecentScanCard (1px via `CARD`).
→ Normalise 1.5px → 1px `.edge-hairline`. Mixed 1px/1.5px is the "no visible rule" symptom.

### 2.3 Icon buttons — hairline, but almost all under 44px

`.profile-topbar button` 40, `.personal-details-header button` 40,
`.medical-profile-header button` 40, `.health-goals-header button` 40,
`.trends-back-btn` 40, `.trends-header-actions` 40, `.fr-back-btn` 40,
`.result-back-button` 42, `.compare-back-button` 42, `.history-topbar button` 42,
`.food-db-header > button` 42, `.streak-page-header button` 42, `.barcode-header button` 42,
`.theme-toggle-btn` 42 (38 under 380px), `.dashboard-streak-pill` 42 (38 under 380px),
`.dashboard-week-nav` 40, `.compare-pagination button` 38,
`.personal-detail-control button` **27**, `.servings-edit-box button` **32**,
Paywall close **36**, PaywallModal close 40, Login/SignUp eye toggles **~26**,
LanguageSwitcher trigger **~29**.
→ `.tap-44` on each; visual size unchanged.

### 2.4 Icon-in-circle badges — three different rules today

| Instance | Current |
| --- | --- |
| Dashboard "Scan Food" camera | `bg-white/20`, `rounded-xl`, inside filled primary |
| Dashboard "View History" pulse | `primary/12` mix, `rounded-xl` |
| Dashboard Explore tiles | `primary/11` mix, `rounded-xl` (11% vs 12% — one-off) |
| Dashboard "This month" sparkles | `tertiary/12` mix |
| `BmiCard` scale | `primary/12` mix |
| `.profile-action-icon` 36px | `primary/10` mix **+ 1px border** |
| `.fitscan-action-icon` 46px | `primary/12` / `tertiary/12` |
| `.leaderboard-avatar` 42px | `primary/12` |
| `.food-db-mark`, `.fitscan-food-mark` | `primary/12` |
| `.stat-card-icon` 36px | 4 different accent/10 mixes |
| `.delete-confirm-icon-wrap` 56px | `error/10` + 1.5px border |
| Streak chip flame | **no backdrop** (correct per §7) |
| `.fitscan-streak-pill` flame | no backdrop (correct) |

→ Normalise to the single rule in `DESIGN_TOKENS.md` §7: 12% mix of the element's accent,
`rounded-lg`, no border, `white/20` when on a filled surface.

### 2.5 Chips / pills

`.dashboard-count-pill` (fill, no edge), `.nutrient-chip-*` (1px — correct),
`.fitscan-nutrient-chip` (1px), `.result-status-badge` (1px inline),
`.badge-status` / `.badge-category` (no edge), `.sheet-score-pill` (no edge),
`.plan-badge` (no edge), `.food-db-score` / `.history-entry-value` /
`.leaderboard-points` (fill, no edge), `.fitscan-bmi-pill` (fill, no edge),
ScanQuotaBar plan badge (no edge), Dashboard RecentScanCard macro chips (no edge),
BMI category badge (no edge).
→ `.edge-hairline` on all; the chip is a distinct surface.

### 2.6 Cards / surfaces

`ns-card` / `glass-card` / `CARD` const (1px — the reference), `.fs-card` (1px, mockup only),
`.result-summary-card` (inherits `ns-card`; loses border in `has-bg-image`),
`.result-facts-card`, `.result-audit-card`, `.stat-card-premium`, `.fitscan-*-card` (1.5px),
`.profile-menu-group` (1.5px), `.profile-plan-card` (1px; `.premium-card` 2px = correct
selected treatment), `.medical-summary-card` / `.health-goals-summary-card` /
`.food-db-hero` (1px accent-tinted).
→ Collapse 1.5px → 1px hairline; keep `.premium-card` as `.edge-bold`.

### 2.7 Selected / active states — currently 5 different mechanisms

| Instance | Current mechanism |
| --- | --- |
| `.dashboard-day-button[aria-pressed=true]` | **2px accent border, transparent fill** ← the correct one |
| `.fitscan-week-strip button.is-selected` | solid primary fill + white text |
| `.result-tabs button.is-active` | card fill + shadow + 3px underline |
| `.range-tabs button.active` | solid primary fill |
| `.fr-filter-tabs button.active` | inverted fill (`on-surface` bg) |
| `.category-chips button.active` | solid primary fill |
| `.medical-severity-control button.is-active` | solid primary fill |
| `.medical-issue-item.is-selected` | 10% tint + 0.42 alpha border |
| `.health-goals-list button.is-selected` | 10% tint + 0.42 alpha border |
| `.profile-language-list button.is-selected` | 12% tint + 0.4 alpha border |
| `.leaderboard-row.is-current-user` | 8% tint + 0.38 alpha border |
| `.compare-product-card.is-selected` | 0.5 alpha border + tint |
| PaywallContent package selected | `border-2` emerald + tint |
| PaywallModal plan selected | `border-2` blue + `scale-105` |
| MobileBottomNav active tab | tint backdrop (**dead class**, see §3) |

→ All become `.edge-bold` (2px accent, minimal fill), matching the date cell.

### 2.8 Modals / sheets / overlays

`.trends-bottom-sheet` (no border), `.fr-bottom-sheet` (no border),
Paywall `DialogPanel` (no border), PaywallModal panel (no border),
`.profile-modal-card` (1px), `.delete-confirm-card` (1.5px),
`.delete-scheduled-success-card` (1.5px), `.ns-modal-overlay`.
→ `.edge-hairline` + `--elev-floating` on all; sheets currently float with no edge, which
is why they blend into the page in dark mode.

### 2.9 Empty / loading / error states

- Empty, dashed 1px: `.medical-empty-result`, `.health-goals-empty-result`,
  `.history-state`, `.food-db-empty`. Keep dashed (it reads as "nothing here yet") but
  move to the hairline token colour.
- Empty, no edge: `.trends-empty`, `.compare-empty`, `.fr-empty`, PaywallContent empties,
  Dashboard "No scans yet". → hairline dashed.
- Loading: `.food-db-skeleton`, `.history-spinner`, `.compare-spinner`,
  `.result-button-spinner`, `.spinner`, `.leaderboard-loading-icon`,
  `.trends-loading`, `.fr-loading`, `LoadingState`, ScanQuotaBar skeleton. → in-button
  cases consolidate to `.btn-spinner`.
- Error, hairline: `.delete-confirm-error`, `.compare-error`, Login/SignUp/PaywallModal boxes.
- Error, **no edge**: `.personal-details-error`, `.medical-profile-error`,
  `.health-goals-error`, `.profile-photo-error`, `.food-db-error`, `.fr-error`,
  PaywallContent error, Dashboard error. → hairline with `--ns-error` accent.

### 2.10 Nav

`MobileBottomNav` (routed): container 1px top border; FAB fill + **dead shadow class**;
inactive tabs no edge; active tab **dead bg class**.
`.bottom-nav` / `.bottom-nav-scan-btn` (legacy CSS, no JSX consumer found).
`.fitscan-home-nav` / `.fitscan-nav-pill` / `.fitscan-nav-scan` (legacy, 4-stop shadows).
`.sidebar-nav-link` (desktop shell, active = fill + shadow).
→ FAB gets `.edge-highlight` + `--elev-floating`; active tab gets `.edge-bold`; nav column
height raised to a 44px hit area.

## 3. Dead / broken styles found (fix as part of the pass)

| Where | Problem |
| --- | --- |
| `MobileBottomNav` FAB | `shadow-[0_6px_18px_rgba(16, 185, 129,0.4)]` — space in arbitrary value, compiles to nothing → **FAB has no shadow** (brief finding #3) |
| `MobileBottomNav` active tab | `bg-[rgba(16, 185, 129,0.12)]` — same, → active tab has no tint |
| `Login`, `SignUp` submit | `shadow-[0_4px_14px_rgba(16, 185, 129,0.38)]` → no elevation |
| `DashboardRedesign` CTA + FAB | two space-containing shadows → no elevation |
| `Trends` Filter icon | styled as a control, has no `onClick` |
| `FoodDatabase` header Database icon | styled identically to the back button, not interactive |
| `PaywallModal` plan cards | clickable `div`, no `role` / `tabIndex` / key handler |
| `Profile` theme toggle | `div[role=button]` with `tabIndex` but no key handler |
| `Compare` product card | `:focus-visible { outline: none }` with only a border-colour substitute |
| `.graph-wrapper` | `outline: none !important` on Recharts nodes, no replacement |
| `Login`/`SignUp` eye toggles | `tabIndex={-1}` — unreachable by keyboard |
| `FeatureRequests` search clear | bare 16px `<svg onClick>`, not a button |

## 4. Builder lanes

No two lanes touch the same file. `tailwind.css` is shared, so each lane owns **only its
own class prefixes** inside it.

| Lane | JSX files | Owned CSS prefixes |
| --- | --- | --- |
| **A — Dashboard & cards** (calibration lane, runs first) | `Dashboard.jsx`, `ScanQuotaBar.jsx` | `dashboard-`, `fitscan-dashboard-*`, `fitscan-bmi-` |
| **B — Scan flow** | `Home.jsx`, `BarcodeScanner.jsx`, `Results.jsx`, `LoadingState.jsx` | `scan-`, `barcode-`, `result-`, `servings-` |
| **C — Profile & settings** | `Profile.jsx`, `LanguageSwitcher.jsx`, `ThemeToggle.jsx` | `profile-`, `personal-detail(s)-`, `medical-`, `health-goals-`, `delete-confirm-`, `deletion-banner-`, `language-selector`, `theme-toggle-btn` |
| **D — Nav, lists & modals** | `MobileBottomNav.jsx`, `History.jsx`, `FoodDatabase.jsx`, `Compare.jsx`, `Trends.jsx`, `StreakLeaderboard.jsx`, `FeatureRequests.jsx`, `ErrorBoundary.jsx` | `bottom-nav`, `history-`, `food-db-`, `compare-`, `trends-`, `stat-card-`, `range-tabs`, `graph-`, `sheet-`, `streak-`, `leaderboard-`, `fr-` |
| **E — Onboarding & paywall** | `Onboarding.jsx`, `Login.jsx`, `SignUp.jsx`, `Paywall.jsx`, `PaywallContent.jsx`, `PaywallModal.jsx` | `nf-ob-`, `plan-`, `profile-plan-`, `profile-modal-` |

Excluded: `DashboardRedesign.jsx` — unrouted mockup with its own private `--fs-*` theme and
its own Google Fonts import (Plus Jakarta Sans / Inter, neither of which is the app's type
system). Polishing it would mean maintaining a second design system. Flagged for deletion
separately; not part of this pass.

## 5. Duplicate-functionality decisions

Verified against `App.jsx` route table (`VIEW_TO_PATH`) and `MobileBottomNav` `NAV_ITEMS`.

| Pair | Same destination? | Decision | Reason |
| --- | --- | --- | --- |
| Dashboard "Scan Food" vs bottom-nav "Scan" | Yes — both `onNavigate('home')` → `/scan` | **Keep both.** Dashboard tile stays the screen's single `.edge-highlight` primary action. | The nav FAB is persistent chrome available from every screen; the dashboard tile is the "start here" moment on an otherwise passive summary screen and carries the scan-quota context around it. Removing the tile would leave the dashboard with no primary action at all, which is what makes the current screen read as flat. |
| Dashboard "View History" vs bottom-nav "History" | Yes — both `onNavigate('history')` → `/history` | **Keep, demote to secondary.** `.edge-hairline`, no accent fill. | It is genuinely redundant with the nav tab and lands on the same list, so it earns no visual weight. It stays because it pairs with "Scan Food" to form the 2-up action row, and removing it would leave an orphaned single tile. It must not compete with the primary action, which is exactly the "two treatments, no rule" problem today. |
| Dashboard "See all" vs the same History tab | Yes | **Keep as text button.** No edge (exempt per §2.4 rule 4). | Section-scoped affordance next to a heading, standard pattern, carries no surface. |
| Dashboard Explore tiles (Compare / Food DB / Trends / Profile) vs nav tabs Trends + Profile | Trends and Profile overlap; Compare and Food DB have no nav tab | **Keep all four, hairline.** | Splitting the grid would break the 4-up rhythm, and two of the four are the only entry point to their screens. Uniform hairline signals "these are peers", which is the actual fix — today they look like the primary action's siblings. |

No component is deleted as part of this pass.

## 6. Order of execution

Lane A first, alone, as the calibration case named in the brief. Its diff becomes the
reference every other lane matches. Lanes B–E then run against the shared token layer,
followed by the reviewer pass.
