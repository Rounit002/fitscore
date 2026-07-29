# UI Polish Pass — Changelog

Grouped by category, not by file. Companion to `DESIGN_TOKENS.md` (the spec) and
`UI_POLISH_INVENTORY.md` (the inventory and lane assignments).

## Border / edge system
- Fixed the root cause of "borders are mostly absent": `--ns-button-border` in dark mode
  was `rgba(0,0,0,0.68)`, a near-black border on a `#111111` surface. Every one of the
  app's 117 buttons inherits a forced border from a global rule, so all of them were
  effectively edgeless in dark mode. Now `rgba(255,255,255,0.10)`, matching the hairline.
- Introduced exactly three treatments as utilities — `.edge-hairline` (1px, `black/8`
  light / `white/10` dark), `.edge-highlight` (soft accent ring via box-shadow),
  `.edge-bold` (2px accent) — so a fourth cannot be invented by accident.
- Gave the ~19 fill-only primary buttons a real edge. A saturated fill is no longer
  treated as a substitute for one.
- Collapsed **nine** different selected/active mechanisms (solid fill, inverted fill,
  tint + alpha border, underline pseudo-element, scale-up) into the single bold-outline
  pattern the calendar's "today" cell already used correctly.
- Normalised 49 stray `1.5px` borders to the 1px hairline.
- Added edges to chips/pills/badges, modals and sheets (which floated with no edge at all),
  and to the 8 error surfaces that had none while 4 others did.

## Radius
- Established a 6-step scale (8 / 12 / 16 / 20 / 28 / full) and remapped Tailwind's
  `rounded-*` utilities onto it, so `rounded-lg` and friends are all a builder needs.
- Migrated **169** off-scale values: 34 distinct CSS `border-radius` values reduced to the
  6 scale steps, plus all 6 arbitrary `rounded-[Npx]` utilities removed from JSX.
- Kept genuine shape radii (capsule tracks, sheet tops, accent rails) exempt and
  documented as such, rather than flattening them into the scale.

## Elevation / shadow
- Replaced 81 distinct `box-shadow` values with a 4-level scale (rest / raised / floating /
  pressed) plus one accent glow, each a soft multi-stop shadow.
- Dark mode gets its own values: a black shadow is invisible on a near-black surface, so
  dark elevation is carried by an inset top highlight plus a wider, softer ambient shadow.
- Legacy `--shadow-sm|md|lg|card|glow|neon` now alias the new scale, so ~78 existing
  consumers updated without being touched.

## Broken styles repaired
Six arbitrary Tailwind values contained a space, which cannot compile, so they emitted **no
CSS at all**. These were an independent cause of missing elevation:
- bottom-nav FAB had no shadow (this is why it read as pasted onto the bar, not lifted)
- bottom-nav active tab had no backdrop tint
- Login and SignUp submit buttons had no elevation
- two more in the unrouted mockup

## Interaction states
- Pressed now reads as pressed: `scale(0.98)` **plus** an elevation drop. The previous
  global `button:active { opacity: 0.85 }` made filled buttons look disabled instead.
- One disabled treatment (`opacity: 0.5`, no shadow, `cursor: not-allowed`) replaces a
  spread of eight different opacities and a grayscale filter.
- Added a global `:focus-visible` ring. `focus-visible:` appeared **zero times** across all
  24 component files beforehand, against 13 `outline: none` declarations.
- Restored focus rings on the elements that removed them without a replacement (Compare
  cards, Recharts surface, the six search inputs).
- Consolidated four different spinner implementations into one `.btn-spinner` that sizes to
  its label and inherits `currentColor`; wired `aria-busy` on the loading buttons.

## Typography
- Added `font-variant-numeric: tabular-nums` to every figure that updates in place
  (calories, macros, scores, streak, BMI, scan counts). There were **zero**
  `font-variant-numeric` declarations before, so these values jittered as digits changed
  width.
- Normalised uppercase tracking, which ranged from `0.02em` to `0.2em` across 47
  declarations, to `0.12em` for labels and `0.08em` for micro badges.
- Switched small emerald text to `--ns-primary-con`: `#10B981` on white is only ~2.3:1,
  below the AA threshold.

## Icons
- One rule for icon-in-circle badges: 12% mix of the element's own accent, `--r-lg`, no
  border. Replaces a spread of 9/10/11/12/13/16% mixes, some bordered and some not.
- The streak chip's flame correctly keeps **no** backdrop, because the chip is already the
  container — this is now a stated rule rather than an inconsistency.
- Snapped icon sizes (which spanned 16 different values) to one size per context, and added
  a 0.5px optical nudge to the top-heavy glyphs (`Flame`, `Sparkles`).

## Motion
- One duration/easing pair for micro-interactions (`150ms`, `cubic-bezier(0.22,1,0.36,1)`),
  replacing `160ms` (50 uses), `180ms` (20), `200ms`, `220ms`, `280ms` and `420ms`.
- Added `transform` to transition property lists that omitted it, without which the new
  pressed state would snap instead of animating.
- Extended the reduced-motion guard from the scan-beam animation only to app-wide, while
  keeping colour/opacity feedback and the loading spinner legible.

## Touch targets
- 44×44 minimum hit area on ~28 controls that were 27–42px, via an overlay that grows the
  target without changing the visual size. Worst offenders were the 27px stepper buttons
  and the 32px servings buttons.

## Duplicate functionality
Both flagged pairs lead to the same route. Neither was deleted:
- **"Scan Food" vs the Scan tab** — kept, and made the dashboard's single primary action.
  Removing it would leave the dashboard with no primary action at all, which is part of why
  the screen read as flat.
- **"View History" vs the History tab** — kept but deliberately demoted to a hairline
  secondary. It is genuinely redundant, so it earns no visual weight; it stays because it
  pairs with "Scan Food" to form the action row.

## Verification
- `npm run build` passes; the token utilities were confirmed present in the compiled CSS
  rather than assumed.
- `scripts/review-tokens.mjs` is the Phase 4 reviewer, run as a check: **12/12 passing**,
  zero outstanding findings. It fails the build on a regression, so the spec stays enforced.
- Test suites: 11 pass, 5 fail. The 5 failures are pre-existing ESM/Jest-globals
  configuration errors (`jest is not defined`, `require is not defined`) in files this pass
  never touched; they fail identically before and after. Login and SignUp, whose buttons
  were rewritten, both pass.
- Browser verification in both colour modes was attempted but the Playwright bridge would
  not connect, so light/dark was verified by reading the compiled token values per mode,
  not visually. **This is the one gap worth a human eye before shipping.**

## Excluded, and why
`DashboardRedesign.jsx` is unrouted, carries its own private `--fs-*` theme, and imports
its own fonts (Plus Jakarta Sans / Inter — neither is the app's type system). Polishing it
would mean maintaining a second design system. Flagged for deletion separately.

---

# Round 2 — cross-mode parity, semantic colour, duplicate data

Addresses brief section 0.6. Four of the six named findings reproduced from
source; two did not (see "Findings that did not reproduce"). The holistic audit
then found five more instances of the same categories.

## Semantic colour
- Built the semantic colour map the spec asked for: score bands, trend states,
  ingredient impact and BMI bands each defined once as `--sem-*` tokens and
  referenced everywhere, instead of being re-picked per component.
- Fixed "Stable" rendering in two colours on one screen. The stat-card icon was
  hardcoded to the `trend` class (always blue) regardless of actual state, and
  `.graph-trend-chip` had **no CSS at all**, so it inherited the amber inline
  colour of its parent score row. Both now read from one `TREND_META` table, so
  the icon, label and colour cannot disagree.
- "Stable" is now neutral grey rather than amber: it means "no movement", and
  amber implies a warning the data does not carry.
- Collapsed **five** private score-band tables (Dashboard, History, Results,
  Compare, Trends) into the existing shared helper. They had genuinely different
  thresholds — `>= 5` in three files, `>= 6` in Results — so the same scan could
  render amber on one screen and green on another.
- Fixed the shared helper itself: it mapped "high risk" to `#10B981`, the brand
  **emerald**, so the second-worst band rendered as healthy green. It also gave
  `>= 8` and `>= 6` the same colour, collapsing two bands into one.
- Band fills are now derived from the band's own colour by opacity mix rather
  than hand-picked rgba, so a fill can no longer drift from the text colour it
  sits behind. One case was already wrong: score 3 returned an amber fill next
  to emerald text.
- Raised light-mode band colours to `#059669` / `#B45309` / `#DC2626`. The old
  `#5BAD4E` and `#F59E0B` were used for small text on white at ~2.4:1 and
  ~2.2:1, below AA.
- Macro tints (protein/carbs/fats) moved to the brand ramp. They identify *which*
  nutrient, not a judgement, and protein was previously the score green, which
  implied "protein = good".

## Cross-mode consistency
- Fixed `--ns-button-border`: `black/24` in light against `white/10` in dark, so
  the forced global button border on all 117 buttons was three times heavier in
  light mode. The dark half of this fix landed last pass; the light half was
  specified in the token audit and never applied.
- The "Premium Active" banner is gold but inherited the shared primary-action
  ring, which tints from the emerald accent. At 18% over gold it was invisible in
  light mode; at 26% over near-black it read as a border — the reported
  "no border in light, border in dark". It now rings in its own gold accent, so
  the treatment is identical in both modes.
- Shape for icon badges and stat-card marks is declared once outside any
  colour-mode scope, so future drift appears in the diff rather than hiding in a
  distant `html.dark` block.

## Light-mode contrast
- Page background `#F5F5F5` → `#EBEEEC`. Against white cards the old gap was
  0.039 luminance, so surfaces blurred together no matter how carefully the
  hairline was applied. The gap is now 0.075 and the reviewer enforces ≥ 0.05.

## Duplicate data
- Removed the month scan-count pill from the calendar card. It and the "This
  month" summary card both rendered `scansForSelectedMonth.length` — the same
  number, same scope, two components. The summary card is now its single home;
  the calendar card keeps only the selected-day count, which is different data.

## Colour without meaning
- Weekday letters (SU/MO/TU…) inherited the day button's text colour, so they
  turned emerald on hover and green on the selected cell — colour carrying no
  information. They are now one muted neutral on every cell, reserving colour for
  the selected day, which already had the bold outline plus dot marker.

## Findings that did not reproduce
Two reported items have no supporting rule in the source, and I could not
reproduce them:
- **Multicoloured weekday letters.** All seven resolve to one shared colour per
  state. There is no colour array, no `nth-child` rule, and only one live
  weekday strip. The real defect there was the inherited-accent issue above.
- **Icon badge as rounded square in light, circle in dark.** `.profile-action-icon`
  is `border-radius: 12px` with no `html.dark` override anywhere; the compiled
  CSS confirms one radius in both modes.

Most likely explanation for both: the screenshots came from `mobile/www/assets`,
a stale Cordova bundle whose CSS predates the first polish pass. Worth confirming
before treating either as fixed — if they still appear in a fresh build, the cause
is outside the stylesheet.

## Enforcement added
- `scripts/review-tokens.mjs`: 12 → **17 checks**, all passing. New gates cover
  cross-mode shape parity, raw band hexes in JSX, CSS-vs-JS mirror agreement,
  duplicate band colours, and the light-mode luminance gap.
- Fixed a latent bug in the reviewer itself: it read the *first* declaration of a
  token, not the winning one, so it would have audited dead CSS once a token was
  redeclared later in the cascade.
- `scripts/verify-modes.mjs` is new. It resolves every semantic and edge token
  against the **compiled** stylesheet in both modes and fails on shape drift,
  missing values, or edge-weight (alpha) drift. This closes the light/dark
  verification gap the previous pass flagged as needing a human eye — the
  browser bridge still would not connect, so verification is token-level rather
  than visual.

## Verification
- `npm run build` passes; both audit scripts pass (17/17 and 0 drift) against the
  compiled output rather than the source.
- Test suites: 11 pass, 5 fail — the same pre-existing ESM/Jest-globals errors
  (`jest is not defined`, `require is not defined`) in files this round never
  touched. `scoreColor.test.js`, which I rewrote, passes 17/17.
- The rewritten score tests now assert the *invariant* (a band's fill derives
  from its own colour, all bands are distinct) rather than literal rgba strings.
  The old assertions passed while the fill and text colour disagreed.
- Still not visually verified in a browser. That remains the one thing worth a
  human eye, particularly the new light-mode page tint.

---

# Round 3 — category accents, preview empty states, radial progress

Addresses brief section 0.7. The reference dashboard was treated as a quality bar
to extract rules from, not a layout to copy — and in one case copying it directly
would have introduced a bug (see "carbs" below).

## Semantic colour — one accent per category
- Every macro badge in the app was the same brand green (or a neutral grey circle
  holding a letter), regardless of which nutrient it represented. Round 2 had
  correctly moved macros *off* the score palette so protein no longer implied
  "good", but it moved all of them onto the same brand colour, so the badges
  still identified nothing. A badge that cannot distinguish protein from carbs is
  decoration sitting where information belongs.
- Added `--sem-macro-calories|protein|carbs|fats|sodium` in both modes, mapped
  once in `src/utils/macroMeta.js`. Each category now has its own accent, its own
  soft tinted badge, and its own lucide glyph.
- Applied to all three places macros appear, which previously each did it
  differently: the dashboard macro bars (neutral letter badge + all-green
  tracks), the scan card chips (uniform grey), and the Results macro grid
  (emoji).
- **Carbs is a warm tan, not the reference's amber.** `#FBBF24` was the first
  draft and is *exactly* `--sem-score-avg` in dark mode, so a carbs badge and a
  "caution" score would have rendered the same colour — categorical colour
  reading as a judgement, which is the confusion the two scales were separated to
  prevent. The reference has no score band to collide with; we do.
- Colour is never the only carrier: each category pairs its accent with a
  distinct glyph, so it survives greyscale.
- All ten values verified against AA as small text on their own surface:
  4.92–8.02:1 light, 6.32–10.19:1 dark.

## Icons
- Replaced the emoji in the Results macro grid with lucide glyphs. Emoji ignore
  colour mode, share no stroke weight with the other ~200 icons in the app, and
  render as a different picture on every platform — they were the one place the
  icon system had a hole rather than an inconsistency.

## Empty states
- The dashboard and history empty states were a glyph and two sentences. They now
  render a skeleton of the real scan card (thumbnail box, two text lines, score
  box, five-up chip strip) with two offset cards behind it, so the state shows
  what the feature produces instead of only stating that nothing is there.
- Built as one shared `EmptyPreview` rather than inlined twice: two copies of
  "what a scan card looks like" would drift, and the preview would stop
  resembling the card it previews.

## Progress indicators
- The daily health score is a value out of 10 and was rendered as a flat figure;
  it now carries a radial arc, the same one the calorie goal uses.
- The ring shows the arc only, with no number inside it — the figure is already
  stated beside it, and duplicating it would be the same data-shown-twice defect
  round 2 removed from the dashboard.
- Extracted `ProgressRing` as a shared component. There were two hand-rolled arcs
  and they had already drifted: 1.4s vs. 700ms transition, 8.3% vs. 8% stroke, a
  hardcoded `55` alpha suffix vs. a `color-mix`. The same idea animated and
  weighed differently depending on which screen you were on.
- Deliberately not applied to scan counts, streak length or monthly totals: no
  natural ceiling, so a ring would have to invent a denominator and display a
  goal the product never set.

## Found by the holistic audit (not in the brief)
These are the round-3 items nobody pointed at:
- **A `1.5px` border had come back**, on the calendar day ring, after round 1
  normalised 49 of them away. `1.5px` is not one of the three treatments, and a
  half-pixel dash against the selected day's `2px` made two deliberate steps read
  as one accidental difference. Now `1px` dashed vs. `2px` solid, which is
  exactly the hairline/bold split the brief's finding 5 describes.
- **Two rules fought the shared ring once Results adopted it.**
  `.health-score-ring svg { transform: rotate(-90deg) }` rotated a ring that
  already rotates itself, starting the arc at 3 o'clock; and
  `.result-score-ring` pinned a fixed `168px` while a breakpoint shrank the
  wrapper to `152px` without shrinking the ring inside it. Both were invisible
  while the arc was local to the file. Size is now a `clamp()` on the component,
  so it shrinks continuously instead of stepping.
- **`getNutritionChips` still emitted emoji** in the shared nutrition util's
  return shape, so any future consumer would have inherited them.

## Not applied — needs a decision
- **Floating pill nav with a detached FAB.** Already the app's structure: the bar
  is a positioning frame with `pointer-events: none`, the pill is a separate
  translucent surface at `--elev-floating`, and the scan action is a detached
  round button with its own accent ring and floating elevation. Brief 0.7 finding
  4 asked for the elevation and flagged the structural change as out of scope —
  the elevation is already there, so nothing was changed. No action needed.
- **Search-with-no-matches states** (food database, compare picker, history with
  an active query) were left as text. Previewing a card there would imply results
  exist when the useful information is that the query matched nothing. Flagged
  rather than silently skipped.
- **`ScanQuotaBar` is unrouted and off-system.** No component imports it, and it
  is built entirely from raw Tailwind palette classes (`bg-emerald-500`,
  `bg-neutral-100`, `text-rose-500`) plus its own three-band colour logic that
  duplicates the semantic map. Left untouched because it renders nowhere; it
  needs a keep-or-delete decision, and if kept it needs a pass of its own.
- **`ScanQuotaBar`'s quota bar would suit a radial** if it is ever routed — it is
  a genuine "X of Y" with a real ceiling.

## Verification
- `npm run build` passes.
- Reviewer gate extended 17 → **25 checks, all passing**. The five new ones cover
  per-category accent existence in both modes, category-vs-category collision,
  category-vs-score-band collision, AA contrast on category accents, non-colour
  markers, emoji-as-icon, shared-ring reuse, and preview empty states.
- Two of the new checks failed on my own first pass and caught real bugs — the
  carbs/amber collision and the duplicate arc in `Results.jsx`. Both fixed before
  sign-off. A gate that never fails on its author is not testing anything.
- Lint: 2 errors in the touched files (`authToken` unused in `Results.jsx` and
  `Trends.jsx`), both confirmed identical on a clean stash of `src`, so
  pre-existing.
- Tests: 11 suites pass, 5 fail — the same pre-existing ESM/Jest-globals errors
  in files this round never touched. 97 tests pass, unchanged.
- `scripts/verify-modes.mjs`: 0 shape drift, 0 edge-weight drift, 0 tokens
  missing from a mode.
- Still not visually verified in a browser. Token- and contrast-level only; the
  new light-mode page tint and the macro accents are the two things worth a human
  eye.

---

# Round 3b — Profile page, and every icon in the app

Extends the round-3 category-accent and icon rules from the dashboard/scan screens
to the Profile page and to every icon badge and icon size in the codebase.

## Semantic colour — Profile settings rows
- All eleven Profile menu rows rendered the identical emerald badge. Eleven
  different destinations looked like eleven copies of one thing, so the badge
  column carried no information — the same defect as the macro badges, one screen
  over.
- Added `--sem-area-account|health|support|premium` in both modes and assigned
  them by **functional group**, matching the section headings the screen already
  declares. Not per row: eleven rows in eleven colours would be a paint chart,
  which fails the restraint half of the reference bar as surely as eleven
  identical badges failed the information half.
- Destructive rows keep `--ns-error` regardless of group — "this deletes your
  data" outranks "this is an account setting".
- Added `--sem-streak` for engagement figures (dashboard streak chip, "best
  streak" stat card). Neither a score nor a category: the amber score band would
  read as a caution on an achievement, brand green as a judgement.
- The two dashboard Explore tiles were also two identical green squares; they now
  take one accent each while keeping the same size, radius and hairline, since
  they are still peers.

## Icon badges — one accent per badge, derived once
- Badge hover hardcoded `--ns-primary`, so a Support row flipped from magenta to
  emerald mid-interaction. Hover now derives from the row's own accent.
- Dropped the `rotate(5deg)` from the badge hover: on a rounded square it reads as
  a wobble, and it was the only rotating hover in the app.
- **Fixed `.delete-success-icon-wrap`: an emerald 12% fill behind `#B45309` amber
  text inside an amber border** — three colours for one meaning, on a success
  dialog. Every badge now states one accent and derives tint, glyph, border and
  hover from it, so the two cannot disagree.
- Same fix applied to `.delete-confirm-icon-wrap` (literal red tint under a
  different `--ns-error` glyph), `.deletion-banner-icon` and
  `.leaderboard-avatar` (light emerald rgba under a dark green glyph).
- Four `.stat-card-icon` accents were raw hexes duplicating the semantic map and
  had already drifted from it: `#10B981` vs `--sem-score-good`'s `#059669`
  (`#10B981` is ~2.3:1 on white, below AA), `#EF4444` vs `#DC2626`, and a
  hardcoded `#F59E0B` round 2 had replaced everywhere else. A literal cannot
  respond to a colour mode, so **dark mode was rendering the light values**.
- Same for `.sheet-product-icon .good/.bad` and `.sheet-product-item em.good`.
- `.profile-avatar` on desktop had a `3px` emerald border — a fourth edge weight
  outside the 1px/2px system, in a literal. Now the 2px bold outline every other
  emphasised state uses.

## Icons — one size per context
- Snapped **31 off-scale icon sizes** across 13 files. The app carried 19 distinct
  sizes; it now carries 8, one per context. This is the class of thing that makes
  two adjacent icons look misaligned while each is individually defensible.
- Two were the wrong *idea*, not just the wrong number: a `44` glyph (44 is the
  touch-target box size, not an icon size) and a `52` hero mark (no such step
  existed). Added `48` as a real step for the single full-screen hero rather than
  stretching the 32 empty-state size over a 112px tile.
- Nav icons moved 21 → 22, so the active state is carried by stroke weight alone
  and the glyph does not shift by a subpixel when a tab is selected.

## Glyph meaning
- Privacy policy used `LifeBuoy` — the support glyph — while `ShieldCheck` was
  already on Terms. Two legal documents were sharing one meaning across three
  glyphs; privacy now takes `Lock`.
- The Profile dark-mode row showed a fixed moon regardless of state. It now
  mirrors `ThemeToggle` and shows the state it will produce; a static moon on a
  row whose switch is already on says nothing.

## Found by the holistic audit (not requested)
- The `.delete-success-icon-wrap` three-colour bug above — a success dialog
  rendering in warning amber.
- `.stat-card-icon.trend` is dead: round 2 replaced it with the three
  `trend-*` variants but left the old rule, still holding `#3b82f6`.
- Four `.nutrient-chip-*`, `.fitscan-*` and `plan-badge` rules hold stale
  pre-round-2 values but are unreferenced by any JSX. **Reported, not edited** —
  polishing CSS that renders on no screen is churn, and deleting it is wider than
  a styling pass should decide unilaterally. The reviewer now lists them as a NOTE
  so the next pass does not mistake them for live code.

## Reviewer gate
- 25 → **31 checks, all passing**. New: icon-size scale, badge single-accent hue
  agreement, stale-hex-in-status-CSS, grouped area accents (fails both if all rows
  share one accent *and* if the grouping collapses into per-row colour), and AA +
  no-collision on area accents.
- The badge-hue check failed on my first draft with 11 hits, most of them the
  legitimate filled-badge pattern. Narrowing it to chromatic-vs-chromatic left 5
  genuine bugs. A check that flags the correct pattern trains people to ignore it.

## Verification
- `npm run build` and `npm run build:cordova` both pass.
- Reviewer gate 31/31; `verify-modes.mjs` extended with the ten new tokens reports
  0 shape drift, 0 edge-weight drift, 0 tokens missing from a mode.
- Lint: only the pre-existing `authToken` / fast-refresh errors, confirmed
  identical against a clean stash.
- Tests: 11 suites pass / 5 fail, 97 tests passing — the documented baseline.
- Note: one intermediate build failed because a JSX comment cannot sit inside an
  expression container; caught and fixed before sign-off.
- Browser verification attempted again and the Playwright bridge still would not
  connect, so light/dark is verified against the compiled CSS per mode rather than
  visually. The Profile badge accents are the main thing worth a human eye.
