# FitScan — Design Token Audit (Phase 1)

Single source of truth for the UI polish pass. Every change made in Phase 3 must be
traceable to a rule in this document.

Scope of the pass: `Frontend/src/components/*.jsx` (className / Tailwind values, plus
wrapper elements only where a pseudo-state needs one) and the token layer in
`Frontend/src/tailwind.css`. No palette change, no font change, no layout
restructuring, no logic change, no new dependencies.

Stack facts confirmed by inspection:
- Tailwind **v4** via `@tailwindcss/vite`; there is **no `tailwind.config.js`**. Tokens
  live in the `@theme` block and `:root` / `html.dark` custom properties inside
  `Frontend/src/tailwind.css` (10,063 lines).
- Dark mode is class-based: `html.dark` (set by `ThemeToggle`), so `dark:` variants and
  the `html.dark` custom-property block are both valid mechanisms.
- Fonts: `--font-headline: 'Sora'` (display/numbers), `--font-main: 'DM Sans'` (body/UI).
  Locale overrides for `ar` / `ur` / `ne` exist and must not be broken.
- 117 `<button>` instances across 24 component files.

---

## 0. Measured "before" state (the problems this spec fixes)

| Finding | Measurement |
| --- | --- |
| Radius is unsystematic | 34 distinct `border-radius` values in CSS; 10 distinct `rounded-*` variants in JSX including 6 arbitrary ones (`rounded-[20px]`, `[24px]`, `[14px]`, `[32px]`, `[10px]`) |
| Shadow is unsystematic | 81 distinct `box-shadow` values in CSS; 18 distinct `shadow-*` variants in JSX, 12 of them one-off arbitrary values |
| Motion is ad hoc | `160ms` (50×), `180ms` (20×), `200ms` (6×), `280ms`, `220ms`, `420ms` all used for the same class of micro-interaction |
| No keyboard focus state in markup | `focus-visible:` appears **0 times** across all 24 component files; 13 `outline: none` / `outline: 0` declarations in CSS with only 17 `:focus-visible` rules to compensate |
| Pressed state mostly missing | Only 18 `active:` utilities total, 13 of which are in `Home.jsx`; `Profile.jsx` (25 buttons), `Results.jsx` (7), `Trends.jsx` (5), `FeatureRequests.jsx` (8), `Compare.jsx` (4) have **zero** hover/active/disabled/focus states |
| No tabular numbers in CSS layer | 0 `font-variant-numeric` declarations; only scattered `tabular-nums` utilities in JSX, so calorie/macro figures jitter on update |
| Broken (silently dead) Tailwind classes | 6 arbitrary values contain a space, which Tailwind cannot compile — they render as **nothing**: see §9 |

### 0.1 Root cause of the "borders are mostly absent" finding

`tailwind.css` line 1488 forces a border on **every** button in the app:

```css
button {
  border: var(--button-border-width, 1px) solid var(--button-border-color, var(--ns-button-border)) !important;
}
```

`--ns-button-border` resolves to:

| Mode | Value | Result |
| --- | --- | --- |
| light | `rgba(15, 23, 42, 0.24)` | visible hairline |
| **dark** | `rgba(0, 0, 0, 0.68)` | **near-black on a `#111111` surface — invisible** |

So the "Scan Food" button, the streak chip and the FAB *do* have a 1px border; in dark
mode it is a black border on a near-black background. The three inconsistent treatments
described in the brief (none / thin ring / bold ring) are the visible symptom of one
token being wrong plus per-element overrides layered on top. Fixing
`--ns-button-border` in dark mode is the single highest-leverage change in this pass and
is prerequisite to everything else.

---

## 1. Radius scale

Canonical scale. Nothing outside this list is allowed.

| Token | Value | Applies to |
| --- | --- | --- |
| `--r-sm` | `8px` | inline chips, mini-badges, macro pills, progress-bar caps |
| `--r-md` | `12px` | inputs, small icon buttons (≤40px), nav item backdrops, tabs |
| `--r-lg` | `16px` | standard buttons, icon-in-circle squircles, calendar day cells |
| `--r-xl` | `20px` | cards, sheets, modals, section surfaces |
| `--r-2xl` | `28px` | phone-shell containers, full-screen sheet tops |
| `--r-full` | `999px` | pills, avatars, FAB, status dots |

Tailwind mapping (v4 `@theme`, so `rounded-md` etc. resolve to these):
`rounded-sm → 8px`, `rounded-md → 12px`, `rounded-lg → 16px`, `rounded-xl → 20px`,
`rounded-2xl → 28px`, `rounded-full`.

**Migration table for existing one-off values.** Left column is what exists today; right
column is the required replacement.

| Existing | → | Reason |
| --- | --- | --- |
| `2px`, `4px`, `6px`, `9px` | `8px` (`--r-sm`) | sub-8px radii read as noise at these sizes |
| `10px`, `11px`, `13px`, `14px`, `15px` | `12px` (`--r-md`) | 46 uses of `14px` + 38 of `12px` are the same intent |
| `18px` | `16px` (`--r-lg`) | — |
| `20px`, `22px`, `24px`, `26px` | `20px` (`--r-xl`) | card family collapses to one value |
| `28px`, `30px`, `32px`, `40px` | `28px` (`--r-2xl`) | shell family collapses to one value |
| `50%`, `99px`, `9999px`, `999px` | `--r-full` | — |
| `rounded-[20px]` (5×), `rounded-[24px]` (3×), `rounded-[14px]` (2×), `rounded-[32px]`, `rounded-[10px]` | `rounded-xl` / `rounded-xl` / `rounded-md` / `rounded-2xl` / `rounded-md` | remove arbitrary values from JSX |
| `rounded-3xl` (3×) | `rounded-2xl` | `3xl` is outside the scale |

Legacy `--radius-*` variables (`--radius-md: 14px`, `--radius-lg: 20px`,
`--radius-xl: 28px`, `--radius-2xl: 28px`) stay declared as aliases pointing at the new
scale so the ~11 existing `var(--radius-*)` consumers keep working; they are not to be
used in new code.

Directional radii that are intentional (`24px 24px 0 0` for sheet tops, `0 4px 4px 0`
for accent rails) are exempt — they are shape, not scale.

---

## 2. Border / edge system (decided — exactly three treatments)

Implemented as three utility classes so a builder cannot invent a fourth. Defined once
in `tailwind.css`, applied in JSX.

### 2.1 Hairline outline — `.edge-hairline`

Default for any distinct surface that is not the focus of attention: cards, secondary
buttons, ghost buttons, chips, inputs, nav backdrops.

```css
--edge-hairline: rgba(15, 23, 42, 0.08);          /* light */
html.dark { --edge-hairline: rgba(255, 255, 255, 0.10); }  /* dark */

.edge-hairline { border: 1px solid var(--edge-hairline) !important; }
```

Light mode uses `black/8`, dark mode `white/10`, per the brief.

### 2.2 Highlighted edge — `.edge-highlight`

Reserved for **the single primary action on a screen**. A soft outer ring in a
low-opacity tint of the element's own accent — not a second hard border. Border stays
hairline-equivalent so total edge weight does not double up.

```css
.edge-highlight {
  border: 1px solid color-mix(in srgb, var(--edge-accent, var(--ns-primary)) 45%, transparent) !important;
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--edge-accent, var(--ns-primary)) 18%, transparent),
    var(--elev-raised);
}
html.dark .edge-highlight {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--edge-accent, var(--ns-primary)) 26%, transparent),
    var(--elev-raised);
}
```

Dark mode raises the ring opacity from 18% to 26% because a low-opacity tint over
`#111111` loses far more contrast than over `#F5F5F5`. `--edge-accent` lets a
destructive or tertiary primary action reuse the same class with its own hue.

Ring width 3px on ≥44px elements, 2px on smaller ones (`.edge-highlight-sm`).

### 2.3 Bold outline — `.edge-bold`

Reserved for unambiguous binary state: selected / active / toggled-on. This is the
treatment today's date cell already uses; it becomes the app-wide pattern for every
selected state.

```css
.edge-bold {
  border: 2px solid var(--edge-accent, var(--ns-primary)) !important;
  background: transparent;
}
```

Little or no fill by design — the outline carries the state, so an active tab, a selected
day and a toggled filter all read the same way.

### 2.4 Decision rule (apply in this order)

1. Is it the one primary action on this screen? → `.edge-highlight`
2. Does it represent selected / active / toggled-on? → `.edge-bold`
3. Is it any other distinct surface (card, secondary button, ghost button, chip, input,
   badge)? → `.edge-hairline`
4. Is it purely decorative or inside an already-edged parent (e.g. a macro bar track, a
   text link)? → no edge, and it must be listed as an explicit exemption in the diff.

A saturated colour fill is **never** a substitute for an edge. `bg-ns-primary` +
no edge is a defect.

### 2.5 Global fix that unblocks the rule

```css
:root      { --ns-button-border: rgba(15, 23, 42, 0.08); }
html.dark  { --ns-button-border: rgba(255, 255, 255, 0.10); }
```

Aligns the forced global button border with `--edge-hairline` so the default state of
every one of the 117 buttons is correct before any per-element work, and the dark-mode
invisible-black-border bug disappears.

---

## 3. Elevation system

Four levels, each a multi-stop soft shadow, each with a dark-mode variant. In dark mode a
black shadow is invisible, so dark elevation is carried by a top inset highlight plus a
wider, softer ambient shadow — the surface appears lit from above rather than casting.

```css
:root {
  --elev-rest:     0 1px 2px rgba(15,17,22,0.04), 0 6px 16px -10px rgba(15,17,22,0.10);
  --elev-raised:   0 1px 2px rgba(15,17,22,0.05), 0 12px 30px -16px rgba(15,17,22,0.18);
  --elev-floating: 0 2px 4px rgba(15,17,22,0.06), 0 24px 56px -20px rgba(15,17,22,0.26);
  --elev-pressed:  0 1px 1px rgba(15,17,22,0.06);
}
html.dark {
  --elev-rest:     inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 20px -12px rgba(0,0,0,0.60);
  --elev-raised:   inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 36px -18px rgba(0,0,0,0.70);
  --elev-floating: inset 0 1px 0 rgba(255,255,255,0.08), 0 28px 64px -22px rgba(0,0,0,0.80);
  --elev-pressed:  inset 0 1px 0 rgba(255,255,255,0.03);
}
```

| Level | Used by |
| --- | --- |
| `--elev-rest` | cards, list rows, chips, resting secondary buttons |
| `--elev-raised` | primary CTA, hovered card, sticky header/footer bars |
| `--elev-floating` | FAB, modals, sheets, toasts, dropdowns |
| `--elev-pressed` | any element in its `:active` state |

Accent glows (`0 4px 18px rgba(16,185,129,0.38)` and its 11 near-duplicates) collapse into
one token used only on the primary CTA and FAB:

```css
--elev-accent: 0 10px 24px -8px color-mix(in srgb, var(--ns-primary) 45%, transparent);
```

Legacy `--shadow-sm|md|lg|card` remain as aliases → `--elev-rest|raised|floating|rest`
so the 78 existing `var(--shadow-*)` consumers update automatically.

---

## 4. Spacing rhythm — 4pt grid

Allowed step values: `4 8 12 16 20 24 32 40 48 56 64`. Tailwind's default scale is already
4px-based (`p-1`…`p-16`), so this means: use scale utilities, never arbitrary `px` padding.

Off-grid values found and their corrections:

| Off-grid | → | Where |
| --- | --- | --- |
| `padding: 18px`, `13px 14px`, `15px 16px`, `14px` | `16px` / `12px 16px` | `.result-header`, `.result-fact-item`, `.result-audit-body`, `.result-facts-card` |
| `padding: 22px 14px 16px`, `24px 18px 18px` | `24px 16px 16px` | `.result-summary-card` |
| `padding: 20px 16px 92px`, `16px 12px 86px` | `20px 16px 92px` → `20px 16px 96px`, `16px 12px 88px` | `.compare-shell` |
| `padding: 5px 9px`, `4px 5px 4px 12px`, `12px 6px` | `4px 8px`, `4px 4px 4px 12px`, `12px 8px` | `.result-status-badge`, `.servings-edit-box`, `.result-macro-item` |
| `p-3.5`, `gap-3.5`, `gap-2.5`, `py-2.5`, `px-3.5` (Tailwind halves = 14px/10px) | nearest 4pt step (`p-4`, `gap-4`, `gap-2`, `py-2`, `px-4`) | `DashboardRedesign.jsx`, `Dashboard.jsx` |
| `min-h-[78px]`, `min-h-[96px]`, `min-h-[102px]`, `min-h-[62px]`, `min-h-13` | `80px`, `96px`, `104px`, `64px`, `52px` | dashboard quick actions, day cells, explore tiles |
| element sizes `h-[52px]`, `h-15 w-15` + inline `style={{height:60,width:60}}` | `h-13 w-13` (52px) / `h-15 w-15` (60px) via class only | `MobileBottomNav.jsx`, `DashboardRedesign.jsx` FAB |

Vertical rhythm between sibling sections stays `gap-5` (20px) mobile / `gap-6` (24px)
desktop, which is already on-grid and consistent — no change.

---

## 5. Typography micro-scale

Families are fixed. Only the micro-properties below are in scope.

| Role | Family | Size / line-height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display (greeting name, big number) | Sora | `30px / 1.05` | 800 | `-0.02em` |
| H1 screen title | Sora | `24px / 1.15` | 700 | `-0.01em` |
| H2 section title | Sora | `16px / 1.25` | 700 | `0` |
| Numeric stat / score | Sora | contextual `/ 1` | 800 | `0`, **tabular** |
| Body | DM Sans | `14px / 1.5` | 400–500 | `0` |
| Body small / caption | DM Sans | `12px / 1.45` | 500 | `0` |
| Label / eyebrow (uppercase) | DM Sans | `10–11px / 1.2` | 700 | **`0.12em`** |
| Button label | DM Sans | `14px / 1` | 700 | `0.01em` |
| Micro badge (uppercase) | DM Sans | `9–10px / 1` | 800 | `0.08em` |

Rules:
1. Uppercase text always carries tracking ≥ `0.08em`. Existing values range from `0.02em`
   to `0.18em` across 47 declarations; normalise to `0.12em` for labels/eyebrows and
   `0.08em` for micro badges.
2. Weight mapping: Sora uses 700/800 only; DM Sans uses 400/500/700/800 only. `font-black`
   / `900` / `850` (present as `font-weight: 850` and `900` in the CSS) map to 800.
   `font-semibold` (600) on Sora maps to 700.
3. **Tabular numbers are mandatory** for any figure that updates in place — calories,
   macros, score, streak, scan counts, BMI:
   ```css
   .num-tabular { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }
   ```
   There are currently 0 `font-variant-numeric` declarations in the CSS layer.
4. Line-height on numeric display stays `1` so ring/gauge centring does not drift.

---

## 6. Button state matrix

Every interactive element must define all five states. Motion values come from §8.

| State | Primary (Emerald fill) | Secondary (surface + hairline) | Ghost (no fill) |
| --- | --- | --- | --- |
| default | `bg-ns-primary`, `.edge-highlight`, `--elev-accent` | `bg-[var(--ns-card-bg)]`, `.edge-hairline`, `--elev-rest` | transparent, `.edge-hairline` |
| hover | `bg-ns-primary-con`, ring 18%→24% | border → `primary/40`, `--elev-raised` | `bg-[var(--ns-hover-tint)]` |
| active / pressed | `scale(0.98)` + `--elev-pressed` + `bg-ns-primary-con` | `scale(0.98)` + `--elev-pressed` | `scale(0.98)` + `bg-[var(--ns-hover-tint)]` |
| disabled | `opacity-50`, `shadow-none`, `cursor-not-allowed`, ring removed | `opacity-50`, `shadow-none`, `cursor-not-allowed` | `opacity-50`, `cursor-not-allowed` |
| loading | spinner replaces icon, label retained, `aria-busy="true"`, pointer-events none, opacity 100% | same | same |
| focus-visible | `outline: 2px solid var(--ns-primary); outline-offset: 2px` | same | same |

Pressed must read as pressed: scale-down **plus** shadow reduction. A darker fill alone is
not sufficient and does not satisfy this spec.

The global `button:active { opacity: 0.85 }` at line 1493 is replaced by the scale+shadow
treatment — an opacity drop on a filled button reads as "disabled", not "pressed".

Loading is currently expressed three different ways (`.spinner`,
`.result-button-spinner`, `.compare-spinner`, plus `Loader2` from lucide). Consolidate to
one `.btn-spinner` sized `1em` and inheriting `currentColor`.

---

## 7. Icon system

- **Library**: `lucide-react` only, `strokeWidth={2}` everywhere (lucide default). No
  mixed stroke widths.
- **Size per context** — one value per context, no in-between:

  | Context | Size |
  | --- | --- |
  | bottom-nav / tab icon | `22` |
  | header & toolbar icon button | `20` |
  | icon-in-circle badge (settings row, stat card) | `18` |
  | inline with body text | `16` |
  | chip / micro badge | `14` |
  | empty-state | `32` |
  | FAB | `26` |
  | full-screen hero mark | `48` |

  This is the whole scale — **eight values, nothing between them**. The app carried 19
  distinct sizes (10, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 26, 32, 38, 40, 44,
  52, 64), which is what makes two icons beside each other look misaligned when each
  one is individually defensible. Round 3b snapped all 31 off-scale usages.

  Two of them were not "wrong size" but "wrong idea": a `44` camera glyph in a scan
  fallback (44 is the *touch-target* box size, not an icon size) and a `52` hero mark
  (no such step existed). `48` was added as a real step for the single full-screen
  hero, rather than stretching `32` to cover a 112px tile.

  The reviewer enforces the list, so a 21 or a 24 cannot drift back in.
- **Icon-in-circle badge — one rule.** A circular/squircle backdrop is used only when the
  icon is the *subject* of a block (quick-action tile, card header, empty state). It is
  never used on an icon that sits inline with text, and never on an icon inside a chip.

  | Container | Backdrop | Icon colour |
  | --- | --- | --- |
  | Inside a filled primary surface | `bg-white/20`, `rounded-lg` | `currentColor` (white) |
  | On a neutral surface, brand meaning | `color-mix(in srgb, var(--ns-primary) 12%, transparent)`, `rounded-lg` | `var(--ns-primary)` |
  | On a neutral surface, other accent (info/warn/error) | same 12% mix of that accent | that accent |
  | Chip / pill (streak, score, tag) | **no backdrop** — the chip *is* the container | accent colour |

  This resolves the streak-chip inconsistency: the flame icon correctly has no circle,
  because the chip is already the container; "Scan Food" and "View History" keep their
  circles and now use the same size, radius and opacity.

  **Single-accent rule (round 3b).** A badge states its accent once, as
  `--edge-accent` on itself or its row, and the tint, the glyph colour, the border
  and the hover fill are all derived from that one value. Setting `background` and
  `color` independently is what let `.delete-success-icon-wrap` end up as an emerald
  12% fill behind `#B45309` amber text inside an amber border — three colours for one
  meaning, on a success dialog. The reviewer fails any live badge rule whose tint hue
  and glyph hue disagree.

  A filled badge drawing its glyph in `--ns-on-primary` is *not* a disagreement: that
  is the intended treatment for an icon on a saturated surface, and the reviewer
  excludes neutral-vs-chromatic pairs for that reason.
- **Optical alignment**: icons paired with a text baseline get `translate-y-[0.5px]` when
  visually top-heavy (`Flame`, `Sparkles`, `Zap`, `TrendingUp`); glyph-centred icons
  (`Camera`, `Search`, `User`) are bounding-box centred and need no nudge. Icon + label
  rows use `items-center` with an explicit `gap-2`, never `gap-1.5`.

---

## 8. Motion tokens

```css
--dur-micro:  150ms;  /* hover, press, colour, border, shadow */
--dur-enter:  220ms;  /* sheets, modals, dropdowns, toasts */
--dur-figure: 700ms;  /* rings, progress bars, gauges */
--ease-out:   cubic-bezier(0.22, 1, 0.36, 1);
--ease-pop:   cubic-bezier(0.34, 1.56, 0.64, 1);
```

- Micro-interactions: `var(--dur-micro) var(--ease-out)`. Replaces the current mix of
  `150ms`, `160ms` (50×), `180ms` (20×), `200ms` (6×).
- Enter/exit for overlays: `var(--dur-enter) var(--ease-out)`. Replaces `220ms`, `280ms`,
  `350ms`, `420ms`.
- Data figures (rings, bars): `var(--dur-figure) var(--ease-out)`; keep `--ease-pop` only
  for the calendar day-select pop, which is an intentional character moment.
- `transform` must be added to every transition property list that currently omits it,
  otherwise the new pressed state snaps.
- Only `transform`, `opacity`, `box-shadow`, `border-color`, `background-color` and `color`
  are animated. No layout-affecting properties.
- `@media (prefers-reduced-motion: reduce)` currently covers only the scan-beam
  animations. Extend it to disable transforms and non-essential animation app-wide while
  keeping colour/opacity feedback.

---

## 9. Broken values found (must be fixed as part of this pass)

Tailwind cannot compile an arbitrary value containing a space; these six classes emit
**no CSS at all** today, which is a second, independent cause of missing elevation:

| File | Class | Effect |
| --- | --- | --- |
| `MobileBottomNav.jsx` | `shadow-[0_6px_18px_rgba(16, 185, 129,0.4)]` | FAB has **no shadow** — directly explains brief finding #3 |
| `MobileBottomNav.jsx` | `bg-[rgba(16, 185, 129,0.12)]` | active tab has **no backdrop tint** |
| `Login.jsx`, `SignUp.jsx` | `shadow-[0_4px_14px_rgba(16, 185, 129,0.38)]` | submit buttons have no elevation |
| `DashboardRedesign.jsx` | `shadow-[0_14px_34px_-12px_rgba(4, 120, 87,0.65)]`, `shadow-[0_10px_26px_-6px_rgba(4, 120, 87,0.7)]` | mockup CTA/FAB have no elevation |

All are replaced by `--elev-*` / `--elev-accent` tokens rather than fixed arbitrary
values.

---

## 10. Touch targets

- Minimum hit area **44×44 CSS px** for every tappable element, even when the visual
  element is smaller. Where the visual must stay small, expand with padding or a
  `::after` overlay:
  ```css
  .tap-44 { position: relative; }
  .tap-44::after {
    content: ''; position: absolute; inset: 50% auto auto 50%;
    width: max(100%, 44px); height: max(100%, 44px);
    transform: translate(-50%, -50%);
  }
  ```
- Known violations to fix: `.theme-toggle-btn` (42px, and 38px under 380px viewport),
  `.dashboard-streak-pill` (42px/38px), `.compare-back-button` and
  `.compare-pagination button` (42px / 38px), `.result-back-button` (42px),
  `.servings-edit-box button` (32px), `.dashboard-week-nav` (40px), bottom-nav items
  (36px icon area inside a ~56px column — column height must reach 44px minimum),
  "See all" text buttons (min-height 36px).
- Adjacent targets keep ≥8px separation so the expanded hit areas do not overlap.

---

## 11. Accessibility floor (reviewer gate)

- Text contrast ≥ 4.5:1, non-text/UI boundaries ≥ 3:1 in **both** modes. Note
  `--ns-primary` `#10B981` on white is ~2.3:1, so emerald is never used for small text on
  a light surface — `--ns-primary-con` `#059669` or `--ns-secondary-con` `#065F46` is used
  instead. This constrains where "See all" / link-style emerald text is allowed.
- A visible focus-visible state is mandatory on every focusable element (§6). Any
  `outline: none` must be paired with a `:focus-visible` replacement in the same rule set.
- Bold-outline selected state is not colour-only: it pairs the 2px accent border with the
  existing dot marker or a weight change, so state survives greyscale.
- `aria-pressed` on toggles, `aria-busy` on loading buttons, `aria-current` on the active
  nav item.

---

## 12. What this pass does not touch

Palette values, font families, which element is a card vs a list vs a tab, component
props, routing, data fetching, state management, dependencies, copy. `DashboardRedesign.jsx`
is an unrouted self-contained mockup with its own private `--fs-*` theme and its own font
imports; it is **excluded** from the pass and flagged separately as dead-code /
divergent-theme risk.

---

## 13. Light-mode surface contrast (round-2 finding 7)

Light mode had a border problem *and* a layering problem. The page was `#F5F5F5`
against `#FFFFFF` cards — a luminance gap of 0.039, small enough that card edges
dissolved into the background regardless of how rigorously the hairline was
applied. No edge treatment fixes a surface that is the same value as what it sits
on.

| Token | Before | After |
| --- | --- | --- |
| `--ns-page-bg` (light) | `#F5F5F5` | `#EBEEEC` |
| `--ns-card-bg` (light) | `#FFFFFF` | unchanged |
| luminance gap | 0.039 | 0.075 |

Dark mode already had a real gap (`#111111` page vs `#1C1C1E` card) and is
unchanged. The reviewer enforces a minimum gap of 0.05 so this cannot silently
regress. The new page tint is very slightly green-shifted to sit inside the
emerald identity rather than reading as neutral grey.

---

## 14. Semantic colour map

Every non-neutral colour that carries meaning is defined once and referenced.
Nothing re-picks a hue locally. Four distinct questions get four scales, because
collapsing them implies relationships the data does not support.

| Meaning | Question it answers | Tokens |
| --- | --- | --- |
| Score band | how good is this food | `--sem-score-good` / `-avg` / `-bad` |
| Trend state | which way is it moving | `--sem-trend-improving` / `-declining` / `-stable` |
| Impact | is this ingredient good or bad for you | `--sem-impact-beneficial` / `-harmful` / `-neutral` |
| BMI band | which clinical range | `--sem-bmi-under` / `-normal` / `-over` / `-obese` |
| Macro category | which nutrient is this | `--sem-macro-calories` / `-protein` / `-carbs` / `-fats` / `-sodium` |

Rules:
1. **"Stable" is neutral grey, not a fourth accent.** It means "no movement";
   green and red are already spent on direction. Colouring it amber (as the chip
   did) implies a warning that the data does not carry.
2. **Impact reuses the score palette**, because it is the same good-to-bad
   judgement at ingredient rather than product scope. A beneficial ingredient and
   a good score should not be two different greens.
3. **BMI "underweight" gets its own informational blue**, since it is a range
   marker rather than a judgement; the other three bands share the score hues
   because there the direction genuinely is good-to-bad.
4. **Categorical colour is one accent per category, not one accent for all of
   them.** Macro tints identify *which* nutrient, not whether it is good. Round 2
   moved them off the score palette, which fixed the false judgement
   ("protein = good") but left every category the same brand green — so the
   badges identified nothing and read as decoration. Round 3 gives each category
   its own accent (§14.2).
5. **Fills are derived, never hand-picked.** A band's background is
   `color-mix(... 6–8%, transparent)` of that band's own colour, so a fill cannot
   drift away from the text colour it sits behind.

### 14.1 The two mirrors

Colour lives in two places by necessity: `--sem-*` custom properties for anything
a stylesheet can own, and `SCORE_COLORS` in `src/utils/scoreColor.js` for values
that must be computed in JS (SVG strokes, Recharts props, inline styles). They are
mirrors of one decision and must stay in step — the reviewer diffs them and fails
on drift, because this is exactly the kind of divergence that stays invisible while
each file looks internally consistent.

Contrast note: the light-mode band values moved to `#059669` / `#B45309` /
`#DC2626`. The previous `#5BAD4E` and `#F59E0B` were used for small text on white
at roughly 2.4:1 and 2.2:1, below the AA floor in §11.

### 14.2 Macro / nutrient category accents (round 3)

One accent and one glyph per nutrient category, defined once in
`src/utils/macroMeta.js` as a map onto the `--sem-macro-*` tokens. Both the badge
tint and the progress-track fill derive from the category's own accent, so a fill
cannot drift from the colour beside it.

| Category | Glyph | Light | Dark |
| --- | --- | --- | --- |
| Calories | `Flame` | `#C2410C` | `#FB923C` |
| Protein | `Beef` | `#9F1239` | `#FB7185` |
| Carbs | `Wheat` | `#A16207` | `#D9BE8C` |
| Fats | `Droplet` | `#1D4ED8` | `#60A5FA` |
| Sodium | `Shell` | `#6D28D9` | `#C4B5FD` |

Three constraints, each enforced by the reviewer rather than left to care:

1. **No category may share an accent with another category**, or the colour stops
   distinguishing anything.
2. **No category accent may equal a score-band value.** Carbs was first drafted as
   `#FBBF24`, which is exactly `--sem-score-avg` in dark mode — a carbs badge and
   a "caution" score would have rendered identically, and categorical colour would
   have started reading as a judgement. That is why carbs is a warm tan rather
   than the amber the reference uses: the reference has no score band to collide
   with. Copying its palette directly would have imported a collision.
3. **Every accent clears 4.5:1 on its own surface**, because these are used on
   10–12px labels. Measured: 4.92–8.02:1 light, 6.32–10.19:1 dark.

Colour is never the only carrier — each category pairs its accent with a distinct
lucide glyph, so the category survives greyscale and colour-blindness (§11).

### 14.4 Settings-row area accents (round 3b)

The same "one accent per category" rule applied to the Profile screen's eleven menu
rows, which all rendered the identical emerald badge — so eleven different
destinations looked like eleven copies of one thing and the badge column carried no
information at all.

The accent is per **functional group**, not per row. Eleven rows in eleven colours
would be a paint chart, which fails the restraint half of the reference bar as
surely as eleven identical badges failed the information half. The grouping is the
one the screen already declares with its section headings, so colour reinforces
existing structure rather than inventing a second taxonomy.

| Area | Rows | Light | Dark |
| --- | --- | --- | --- |
| `account` | Personal detail, Language, Dark mode, Logout | `#4338CA` | `#A5B4FC` |
| `health` | Medical profile, Health goal | `#0F766E` | `#5EEAD4` |
| `support` | Request feature, Support email, Terms, Privacy | `#A21CAF` | `#F0ABFC` |
| `premium` | Upgrade / Manage subscription | `#8A6516` | `#D4AF37` |
| *(danger)* | Delete account | `--ns-error` | `--ns-error` |

Destructive rows ignore their group and take `--ns-error`: "this deletes your data"
outranks "this is an account setting".

Set as `--edge-accent` on the row, never as a colour on the badge, so the shared
icon-badge rule keeps deriving the tint, the glyph colour and the hover fill from
one value. Hover previously hardcoded `--ns-primary`, which made a Support row flip
from magenta to emerald mid-interaction.

`--sem-streak` (`#9A3412` / `#FDBA74`) covers engagement figures — the dashboard
streak chip and the "best streak" stat card. Neither a score nor a category: the
amber score band would read as a caution on an achievement, and brand green as a
judgement.

Area accents carry the same three constraints as macro categories (no collision
with each other or a score band, AA on their own surface, 2–5 groups), all
reviewer-enforced. Measured 5.02–8.53:1.

### 14.3 Where a radial indicator applies

A ring is for a value against a real ceiling. Applied to the calorie total
(vs. the daily goal), the product health score and the daily health score
(both /10). Deliberately **not** applied to scan counts, streak length or
"this month" totals: those have no natural maximum, so a ring would have to
invent a denominator and would then be displaying a goal the product never set.

All three come from one shared `ProgressRing` component. There were previously two
hand-rolled arcs that had already drifted — 1.4s vs. 700ms transition, 8.3% vs. 8%
stroke, a hardcoded `55` alpha suffix vs. a `color-mix` — so the same idea
animated and weighed differently depending on the screen.

---

## 15. Cross-mode shape parity

For every component, light and dark may differ **only in colour values** — fill,
border colour, text colour. If radius, border presence, border weight, icon-badge
shape or any structural property changes between modes, that is a bug.

Enforcement, since this class of bug is invisible when reviewing one mode at a
time:
- `scripts/review-tokens.mjs` fails if any `html.dark` rule sets `border-radius`,
  `border-width`, `width`, `height`, `padding` or `margin`.
- `scripts/verify-modes.mjs` resolves each token against the **compiled** CSS in
  both modes and fails on shape drift, on a token missing from one mode, and on
  edge **weight** drift (an alpha difference > 0.03 between modes).

Weight parity matters as much as shape: `--ns-button-border` was `black/24` in
light against `white/10` in dark, so the forced global button border was three
times heavier in one mode. That is the same bug as a radius mismatch, expressed as
opacity, and it survived the first pass because only the dark half of §2.5 was
applied.

Shape for the components most at risk of drifting (icon badges, stat-card marks)
is now declared once outside any colour-mode scope, so a future divergence shows
up in the diff rather than hiding in an `html.dark` block thousands of lines away.

---

## 16. Empty states (round 3)

An empty state on a list of cards previews the card. A glyph plus two sentences
states an absence; it does not show what the feature produces, so a first-time
user learns nothing from the screen that has the most need to teach.

`EmptyPreview` renders a skeleton of the real populated card — same 56px
thumbnail box, same two text lines, same score box, same five-up macro chip strip
as `ScanCard` — with two offset cards behind it to imply a list continuing past
the fold.

Rules:
1. **Shared, never inlined per screen.** Two copies of "what a scan card looks
   like" would drift, and the preview would then stop resembling the thing it
   previews. This is the same reason the score helper was extracted.
2. **The whole preview is `aria-hidden`**, with one `role="status"` label on the
   container, so assistive tech hears the message once rather than a fake list of
   scans.
3. **Applies where the empty thing is a card list** (dashboard's selected day,
   history). A search-with-no-matches state on a text query is *not* upgraded:
   there the useful information is "your query matched nothing", and previewing a
   card would imply results exist. Listed under "not applied" rather than done
   silently.
