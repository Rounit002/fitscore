# FitScan — Premium UI Polish Pass
### Multi-agent prompt for Kiro (Claude Opus 5)

Paste this whole document into Kiro as one spec. Do not summarize or shorten it before running.

---

## 0. Framing (read first, do not skip)

The visual identity of this app is **already decided and already good**: Emerald Green palette, Sora (display) + DM Sans (body/UI), card-based layouts, light and dark mode. You are **not** redesigning it. You are acting as one of the best mobile app UI/UX designers in the world, specializing in Android health apps — hold every single decision in this task to that bar, not to "good enough." You are doing what a top-tier product designer does in the last 10% of a project — the pass where an app stops looking "built" and starts looking "shipped": border treatment, elevation, spacing rhythm, button states, motion timing, icon alignment, touch targets, and — critically — catching the inconsistencies an average developer doesn't notice because each one looks fine in isolation and only breaks down when screens are compared side by side.

Reference bar for the end result: Whoop, Oura, Apple Health, and premium calorie/nutrition-tracking apps (Cal AI, MyFitnessPal) at their best screens. Not their exact colors — their restraint, their consistency, and the fact that no two screens in those apps ever style the same type of component two different ways.

**Non-negotiable constraints — violating these fails the task regardless of how the UI looks after:**
1. Do not change existing business logic, state management, data fetching, routing, or component APIs (props in/out).
2. Do not change the color palette, font families, or overall layout structure (what's a card, what's a list, what's a tab).
3. Only touch JSX markup (only when a wrapper element is needed for a pseudo-state or transition) and className / Tailwind utility values.
4. No new npm dependencies unless you stop and ask first.
5. One component/screen per commit-sized change. No repo-wide find/replace in a single pass.
6. Every change must be traceable to a rule in the Design Token Audit (Phase 1) — no one-off "looks nicer to me" edits that aren't in the spec.

---

## 0.5 Concrete findings from the actual Home screen — use these as the calibration example, don't re-derive from zero

These are real, current issues on the Home screen right now. Fix these first as the reference case, then generalize the same logic to the rest of the app — do not treat this as a separate one-off list.

1. **The border system isn't just inconsistent, it's mostly absent.** The "Scan Food" button, the streak chip (flame icon + "1", top right), and the floating "Scan" button in the bottom nav are flat colored fills with zero edge definition against the near-black background. Meanwhile the theme-toggle circle (top right) and the calendar prev/next arrows already have a visible ring border, and today's date cell ("Mon 27") already has a strong outlined border with a dot marker. That's three different treatments (none / thin ring / bold ring) applied with no visible rule. This is the core problem to solve — see the decided border system in Phase 1 below.
2. **Likely duplicate functionality on this exact screen:** "Scan Food" (home quick action) and the "Scan" tab in the bottom nav appear to lead to the same camera/scan action. "View History" (home quick action) and the "History" tab appear to lead to the same place. Resolve deliberately, don't delete blindly — see the duplicate-functionality check in Phase 2.
3. **The FAB "Scan" button has no lift.** It sits on top of the bottom nav bar visually but has no shadow or ring separating it from the bar, so it reads as pasted on rather than elevated.
4. **Icon-in-circle badges are inconsistent.** "Scan Food" uses a light circle behind its camera icon; "View History" uses a small green circle behind its pulse icon; the streak chip's flame icon has no circle backdrop at all. One rule needed for when an icon gets a circular backdrop and what color it is.

---

## 0.6 Concrete findings, round 2 — Home (light + dark), Health Progress, Profile (light + dark)

More real, current issues, found by comparing screens against each other and against their own light/dark pairs. Treat every one of these as a *pattern* to fix everywhere it occurs, not a single spot-fix — that's the main instruction in this whole document: these are examples of categories of mistakes, not a checklist to clear and stop.

1. **The bottom nav bar's active-tab indicator is implemented three different ways in the same app:** on the Home screen in light mode, the active tab has a tight, cramped-looking filled pill box behind the icon that doesn't match the width/alignment of the other four tabs. On the Home screen in dark mode, the active tab has no box at all — just a color change. On the Health Progress screen, the active tab has a completely different treatment: a bold outlined box around the icon. Pick exactly one pattern (recommend: color change plus the "bold outline" treatment from Phase 1, applied identically) and use it on every tab, every screen, both modes — no exceptions.
2. **The same metric is displayed twice on the Home screen.** "THIS MONTH → scans → 2" (its own card) and "2 scans" (a pill next to the "July 2026" calendar heading) show the identical number in two different components. Pick one place for this data to live and remove the other, or clearly differentiate what each one actually represents if they're not really the same thing.
3. **The weekday letters above the date strip (SU/MO/TU/WE/TH/FR/SA) are each a different, seemingly arbitrary color** (a red, a blue, a purple, a brown, etc.) with no evident meaning. This reads as accidental rather than designed. Unify all of them to a single neutral/muted color, and reserve color only for the selected day (which already correctly uses the bold-outline treatment plus a dot marker — keep that part, just fix the labels around it).
4. **The icon badge next to rows like "Personal Detail," "Language," "Dark Mode," "Edit Medical Profile" is a rounded square in light mode but a full circle in dark mode.** Same component, two different shapes depending on theme. Pick one shape and use it in both modes.
5. **The "Premium Active" banner has no border in light mode but gains a border in dark mode.** Same component, inconsistent treatment. Decide once whether this banner gets an edge treatment and apply it identically in both modes.
6. **The word "Stable" appears in two different colors on the same Health Progress screen** — blue in the "Overall Trend" stat card, orange/amber in the text under the "Daily Health Score" chart. Same word, same meaning, must be the same color.
7. **Light mode has a contrast/elevation problem, not just a border problem.** Cards render as close to pure white directly against a background that's only a shade off white, so surfaces don't read as separated — they blur together ("white streaming into the screen," as you put it). Fix this at the token level: either give the light-mode page background a more deliberate, slightly deeper tint so white cards visibly sit on top of it, or make sure the hairline-outline treatment from Phase 1 is applied to cards in light mode with the same rigor as dark mode (the first version of this spec under-specified light mode — treat light and dark as equally important from here on, not dark-mode-first).
8. **Any place that uses color to carry meaning (the four stat cards on Health Progress: green/red/blue/amber; the score bands Good/Avg/Bad) should also carry that meaning in an icon or label, not color alone** — this is already mostly true here (each card has its own icon), just make sure it stays true everywhere color is added elsewhere in this pass, since color-only meaning is both an accessibility miss and, done inconsistently, reads as decoration rather than information.

**Cross-mode rule going forward:** for every component, light mode and dark mode should differ *only* in color values. If a shape, radius, border presence, or icon-badge form changes between the two modes, that's a bug to fix, not a stylistic choice — findings 4 and 5 above are examples of this exact bug, and there are likely more instances of it elsewhere in the app that aren't in these screenshots. Find them the same way: render or compare each component's light and dark states side by side and diff everything except color.

---

## 1. Agent architecture

Run this as an orchestrator + parallel builders + reviewer loop, using Kiro's subagents:

```
                    ┌───────────────────────┐
                    │   ORCHESTRATOR        │
                    │ (you, main agent)     │
                    └──────────┬────────────┘
                               │
              Phase 1: writes Design Token Audit
              Phase 2: inventories screens/components
              Phase 3: assigns one subagent per area
                               │
        ┌───────────┬──────────┼───────────┬───────────┐
        ▼           ▼          ▼           ▼           ▼
   Builder:     Builder:   Builder:    Builder:    Builder:
   Dashboard    Scan flow  Profile/    Nav/Tabs/   Onboarding/
   & cards      & camera   Settings    modals      paywall
   overlay
        │           │          │           │           │
        └───────────┴──────────┼───────────┴───────────┘
                               ▼
                    ┌───────────────────────┐
                    │   REVIEWER AGENT      │
                    │ audits every diff     │
                    │ against the token     │
                    │ spec + checklist      │
                    └──────────┬────────────┘
                               │
                  fail ──▶ back to owning builder
                  pass ──▶ next screen / done
```

Loop Phase 3 → Reviewer → (fixes) → Reviewer until every screen passes with zero open findings. Builders run in parallel but each one only edits files in its assigned area — no two builders touch the same file.

---

## 2. Phase 1 — Design Token Audit (orchestrator does this first, alone)

Before any file is touched, scan the actual codebase and produce a single source-of-truth token file (or Tailwind config section) covering:

- **Radius scale** — e.g. `sm 8px / md 12px / lg 16px / xl 24px / full`. Map every existing radius usage in the app to one of these. Flag and list every place a radius is currently a one-off value.
- **Border / edge system — already decided, apply exactly this, do not invent a fourth treatment:**
  - **Hairline outline** — `1px solid`, low-opacity neutral (`white/10` in dark mode, `black/8` in light mode). Default for any card, secondary button, or chip that needs to read as a distinct surface against the background but isn't the focus of attention.
  - **Highlighted edge** — a soft outer ring via `box-shadow: 0 0 0 2–3px` in a low-opacity tint of the element's own accent color (not a second hard border). Reserve for the single primary action on a given screen — the one thing the eye should land on first (main scan CTA, a FAB).
  - **Bold outline** — `2px solid` at full accent strength, little or no fill. Reserve for a state that must read as unambiguous and binary: selected/active/toggled-on. Today's date cell already does this correctly — copy that exact pattern for every other selected/active state instead of inventing a new one.
  - Decision rule per element: primary action → highlighted edge. Selected/active/toggled state → bold outline. Any other distinct surface (card, secondary button, chip) → hairline outline. A saturated color fill is never a substitute for an edge treatment — nothing stays completely borderless just because it already has a colored background.
- **Elevation/shadow system** — define 3–4 levels (resting, raised, floating/modal, pressed) as soft, multi-stop shadows, not a single hard `box-shadow`. Each level must have a light-mode and dark-mode variant (dark mode shadows need to be more about a subtle lighter border/glow than a black shadow, which disappears on dark backgrounds).
- **Spacing rhythm** — confirm (or establish) a 4pt base grid. List every padding/margin in the app that doesn't land on the grid.
- **Typography micro-scale** — letter-spacing on uppercase labels/eyebrows, line-height per text role, consistent font-weight mapping between Sora (headings/numbers) and DM Sans (body/labels), tabular-number formatting for any calorie/macro figures so they don't jitter when they update.
- **Button state matrix** — default / hover / active-pressed / disabled / loading, for both primary (Emerald) and secondary/ghost variants. Pressed state should read as *pressed* (slight scale-down + shadow reduction), not just a darker fill.
- **Icon system** — one stroke width across the whole app, consistent size per context (nav icon vs inline icon vs empty-state icon), optical alignment with adjacent text baseline (icons often need a 1–2px nudge to look centered rather than being centered by their bounding box).
- **Motion tokens** — one duration/easing pair for micro-interactions (e.g. `150ms ease-out` for hover/press, `200–250ms` for sheet/modal transitions), applied consistently instead of ad hoc transition values per component.
- **Touch targets** — every tappable element ≥ 44×44pt hit area even where the visual element is smaller (icon buttons, chips, close buttons).
- **Light-mode surface contrast** — define the page background as a deliberately distinct tint from card white (not a near-invisible off-white), so cards read as layered surfaces rather than blending into the background. Give this the same rigor as the dark-mode elevation work — light mode is not an afterthought.
- **Semantic color map** — every non-neutral color used for meaning (status, trend, score bands like Good/Avg/Bad) must be defined once, in one place, and referenced everywhere that meaning appears — never re-picked per component. If "Stable" is blue in one place, it's blue everywhere. Decorative or unexplained color (like differently colored weekday labels with no meaning) gets removed and replaced with the neutral/muted default.
- **Cross-mode shape parity** — for every component, its light-mode and dark-mode versions may differ only in color values (fill, border color, text color). If radius, border presence, icon-badge shape, or any structural property differs between modes, that is a bug, not a design choice — find and fix every instance of this, not just the ones already flagged.

Output this as a written spec (markdown or a `design-tokens` section) before writing any component code, and show it to me before Phase 2 starts.

---

## 3. Phase 2 — Inventory

List every screen/component file that renders UI (dashboard/home, health progress/analytics, scan/camera overlay, results card, profile, settings, onboarding, paywall, nav/tab bar, modals/sheets, empty states, loading states, error states). Group them into the 5 builder lanes shown in the diagram above (adjust lane names to match what actually exists in the repo — Health Progress likely belongs in the same lane as Dashboard & cards).

While inventorying, also build one flat list of every *instance* of these element types across the whole app, not just per screen — this is what the border-system pass actually gets applied to: buttons (primary/secondary/ghost), icon-in-circle badges, chips/pills (streak counter, score badges, tags), nav bar items (top-of-screen icons, bottom tab bar, the FAB), calendar/date cells, and cards. For each instance, note its current edge treatment (none / hairline / bold / other) so builders see the full "before" picture in one place instead of re-discovering it screen by screen.

**Duplicate-functionality check (do this once, here, before builders start):** for every screen, check whether a prominent on-screen action (a quick-action button, a card CTA) leads to the same destination as an existing bottom-nav tab. The Home screen already has two confirmed candidates: "Scan Food" vs the "Scan" tab, and "View History" vs the "History" tab. For each pair found, decide — don't default to deleting either — based on whether the on-screen version does something faster or more specific than the nav tab (e.g. jumps straight into the camera vs. landing on a list first) and whether it's serving a discoverability purpose the nav tab doesn't. Record the decision and a one-line reason before any builder touches those components.

---

## 4. Phase 3 — Builder pass (parallel)

Each builder subagent, for its assigned files only:

1. Re-reads the Phase 1 token spec.
2. For every button, card, input, modal, and icon in its files: replace one-off values with the correct token, add the missing state (hover/pressed/disabled), and apply the correct one of the three edge treatments per the decision rule (highlighted edge for the primary action, bold outline for selected/active state, hairline outline for everything else) — never leave an element with none of the three. Also fix icon-badge circle usage to the one decided rule, fix icon alignment, and apply the motion token to anything that currently snaps instead of transitioning.
3. Explicitly re-checks **dark mode** for every change — borders and shadows almost always need a different value in dark mode, not just a color-mode swap.
4. Produces a before/after diff per file with a one-line reason for each change ("radius was 10px, one-off → 12px/md token", "pressed state had no feedback → added scale 0.98 + shadow drop").
5. Does **not** touch layout structure, logic, or anything outside its lane.

---

## 5. Phase 4 — Reviewer pass

**Step 0 — holistic self-directed audit (do this once, across the whole app, after builders finish their named fixes):** the findings in sections 0.5 and 0.6 are examples of categories of mistakes, not an exhaustive list. Actively look for more instances of each category anywhere else in the app: components whose light/dark versions differ in shape and not just color; the same data point displayed more than once on one screen; color used without a consistent, defined meaning; the same type of component (tab, badge, banner, card) styled differently on different screens. Fix whatever you find using the same rules already established — don't wait to be told about each one individually.

Then, per screen, check:

- Is every radius/shadow/spacing/color value traceable to a token? (Flag any new one-off values introduced by a builder.)
- Do light and dark mode differ *only* in color — no shape, radius, or border-presence drift?
- Does every interactive element have all 4–5 states (default/hover/pressed/disabled/loading)?
- Are touch targets ≥44×44pt everywhere?
- Is contrast still WCAG AA after any border/text-opacity changes, in both modes?
- Is there a visible keyboard focus state on every focusable element?
- Does the same component (nav tab, badge, banner, card) look identical wherever it appears, across every screen?
- Is any single piece of data shown more than once on the same screen without a clear reason?
- Does every non-neutral color map to one documented meaning, used consistently?

Report findings as a pass/fail list per screen. Anything that fails goes back to the owning builder. Repeat until every screen passes with zero findings.

---

## 6. Final output format

1. The Design Token Audit (Phase 1), as its own file/section.
2. Per-screen before/after diffs with one-line reasons (from builders).
3. A list of anything found during the Phase 4 holistic self-directed audit that wasn't in the named findings — this is the part that shows the pass actually caught what an average developer would miss.
4. Final Reviewer pass/fail report, with zero outstanding findings.
5. A short changelog: what changed, grouped by category (radius, shadow, spacing, states, typography, icons, motion, touch targets, cross-mode consistency) — not by file — so it's easy to scan what actually improved.

Do not ship anything the Reviewer hasn't signed off on.
