# Requirements Document

## Introduction

FitScan already has a decided visual identity: Emerald Green palette (`#10B981` primary, `#059669` hover, `#047857` pressed/dark accent), Sora for display type and DM Sans for body/UI, card-based layouts, and a light/dark theme driven by CSS custom properties in `Frontend/src/tailwind.css`. This feature is **not** a redesign.

This feature is a last-10% senior mobile product designer polish pass over the existing Vite + React + TypeScript/JSX SPA in `Frontend/src`: border treatment, elevation, spacing rhythm, button states, motion timing, icon alignment, and touch targets. The reference bar is Whoop, Oura, Apple Health, and MyFitnessPal at their best screens — referenced for restraint and precision, not for color choices.

Delivery is structured as a multi-agent workflow: an Orchestrator produces a Design Token Audit and a Component Inventory, five parallel Builders polish their assigned lanes, and a Reviewer gates every change against the token spec until zero findings remain.

Repository grounding (verified):

- Token source of truth today is `Frontend/src/tailwind.css` (Tailwind v4 `@theme` block plus `:root` / `html.dark` custom properties). There is **no** `tailwind.config.js` in the repository.
- Existing radius custom properties are `--radius-sm: 8px`, `--radius-md: 14px`, `--radius-lg: 20px`, `--radius-xl: 28px`, `--radius-2xl: 28px`, while components use one-off values such as `rounded-[20px]`, `rounded-[24px]`, `rounded-[14px]`, `rounded-[10px]`, `rounded-[32px]`, and `tailwind.css` adds `border-radius: 9px`, `11px`, `12px`, `13px`, `16px`, `18px`, `22px`, `24px`, `28px`, `30px`, plus `99px` / `999px` / `9999px` pill variants.
- `--radius-xl` and `--radius-2xl` are both `28px`, so the existing scale has a duplicate step that the audit must resolve.
- `Frontend/src/components/DashboardRedesign.jsx` and `Frontend/src/components/PaywallModal.jsx` are not imported by `App.jsx` or by any other component; they are unreferenced in the shipped bundle.
- `prefers-reduced-motion` is honored today only for the three scan animations (`.scan-beam`, `.scan-lens-glow`, `.scan-reticle`) and the desktop `cardEnter` grid animation; no other transition respects it.
- `Frontend/src/i18n/` ships Arabic, Urdu, and Devanagari locales that override `font-family` and `line-height` with `!important` per `:lang()`, so typography rules must survive those overrides.
- Frontend verification scripts are `npm run build` (`vite build`), `npm run lint` (`eslint .`), and `npm test` (Jest with `--experimental-vm-modules`); the Cordova bundle uses `npm run build:cordova`.
- Existing shadow custom properties are `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-card`, `--shadow-glow`, `--shadow-neon`, each a single-stop shadow with no dark-mode variant, alongside inline one-offs such as `0 10px 24px rgba(0,0,0,0.08)` and `0 8px 18px rgba(0,0,0,0.08)`.
- UI files under `Frontend/src` are `App.jsx` (routes plus `DesktopAppShell`) and `Frontend/src/components/`: `Dashboard.jsx`, `DashboardRedesign.jsx`, `Trends.jsx`, `StreakLeaderboard.jsx`, `Home.jsx`, `BarcodeScanner.jsx`, `Results.jsx`, `LoadingState.jsx`, `History.jsx`, `Compare.jsx`, `FoodDatabase.jsx`, `Profile.jsx`, `FeatureRequests.jsx`, `MobileBottomNav.jsx`, `ThemeToggle.jsx`, `LanguageSwitcher.jsx`, `ScanQuotaBar.jsx`, `ErrorBoundary.jsx`, `Onboarding.jsx`, `Login.jsx`, `SignUp.jsx`, `Paywall.jsx`, `PaywallContent.jsx`, `PaywallModal.jsx`, plus `SignUp.css`.
- Routes in scope: `/dashboard`, `/scan`, `/scan/barcode`, `/results`, `/history`, `/compare`, `/food-database`, `/trends`, `/leaderboard`, `/profile`, `/features`, `/login`, `/signup`, `/onboarding`.
- The Cordova Android wrapper (`havenn/`, `mobile/`) serves the same built SPA bundle, so touch-target and safe-area rules apply to the shipped Android WebView as well.

## Glossary

- **Polish_Pass**: The complete four-phase workflow defined by this specification, from token audit through Reviewer sign-off.
- **Orchestrator**: The agent that produces the Design_Token_Spec and Component_Inventory and assigns Builder_Lanes. It edits no component files.
- **Design_Token_Spec**: The written Design Token Audit artifact produced in Phase 1, covering radius, border, elevation, spacing, typography micro-scale, button states, icons, motion, and touch targets, and acting as the single source of truth for every later change.
- **Component_Inventory**: The Phase 2 list of every file under `Frontend/src` that renders UI, grouped into Builder_Lanes.
- **Builder_Lane**: One of five disjoint sets of UI files, each owned by exactly one Builder.
- **Builder**: An agent that applies Design_Token_Spec rules to the files of exactly one Builder_Lane.
- **Reviewer**: The agent that audits every Builder diff against the Design_Token_Spec and the Review_Checklist and issues pass/fail findings per screen.
- **Review_Checklist**: The Phase 4 checks: token traceability, dark-mode intent, interactive state completeness, touch-target size, WCAG AA contrast, visible keyboard focus, and cross-lane consistency.
- **Finding**: A single Reviewer-recorded violation, attributed to the owning Builder_Lane and file.
- **Change_Record**: A per-file before/after diff entry with a one-line reason naming the Design_Token_Spec rule that motivated the change.
- **Changelog_Artifact**: The final summary of all changes grouped by category (radius, shadow, spacing, states, typography, icons, motion, touch targets) rather than by file.
- **Token_Source**: `Frontend/src/tailwind.css`, the Tailwind v4 `@theme` and custom-property definitions that hold the project's design tokens.
- **One_Off_Value**: A radius, border, shadow, spacing, color, duration, or easing literal in a UI file that does not resolve to a Design_Token_Spec token.
- **Protected_Surface**: Existing business logic, state management, data fetching, routing, component props in and out, color palette values, font families, and layout structure (which element is a card, a list, or a tab).
- **Interactive_Element**: Any element a user can activate: button, link, tab, chip, toggle, input, card acting as a control, or icon button.
- **Touch_Target**: The activatable hit area of an Interactive_Element, measured including padding and pseudo-element hit expansion.
- **Unreferenced_Component**: A file under `Frontend/src/components/` that no route and no other component imports, and that therefore renders on no screen.
- **Pointer_Capable_Context**: A rendering context whose primary pointer supports hover, as distinguished from the touch-primary Android WebView context.

## Requirements

### Requirement 1: Design Token Audit Artifact

**User Story:** As the design owner, I want a written Design Token Audit produced before any file is touched, so that every later visual change is traceable to a documented rule instead of taste.

#### Acceptance Criteria

1. THE Orchestrator SHALL produce the Design_Token_Spec as a single written artifact before any UI file under `Frontend/src` is modified.
2. THE Orchestrator SHALL derive the Design_Token_Spec from a scan of the actual repository files, including `Frontend/src/tailwind.css`, `Frontend/src/App.jsx`, and every file in `Frontend/src/components/`.
3. THE Design_Token_Spec SHALL define a radius scale of named steps covering small, medium, large, extra-large, and full values, and SHALL map every radius usage found in the repository to exactly one named step.
4. THE Design_Token_Spec SHALL list every One_Off_Value radius found in the repository together with the named step that replaces it, including the current `rounded-[10px]`, `rounded-[14px]`, `rounded-[20px]`, `rounded-[24px]`, and `rounded-[32px]` utility usages and the `9px`, `11px`, `12px`, `13px`, `16px`, `18px`, `22px`, `24px`, `28px`, and `30px` literals in the Token_Source.
5. THE Design_Token_Spec SHALL resolve the duplicate radius steps `--radius-xl` and `--radius-2xl`, which currently hold the same `28px` value, into either one step with one name or two steps with distinct values.
6. THE Design_Token_Spec SHALL define one border treatment rule in which hairline borders use low-opacity neutral values, specifying a light-mode value and a dark-mode value.
7. THE Design_Token_Spec SHALL state that a card uses either a border or a shadow to read as elevated, and SHALL define the maximum combined border weight and shadow strength permitted on a single card.
8. THE Design_Token_Spec SHALL define an elevation system of at least 3 and at most 4 named levels covering resting, raised, floating or modal, and pressed.
9. THE Design_Token_Spec SHALL define each elevation level as a multi-stop soft shadow with a separate light-mode value and dark-mode value, WHERE the dark-mode value uses a lighter border or glow treatment instead of a black drop shadow.
10. THE Design_Token_Spec SHALL establish a 4-point base spacing grid and SHALL list every padding value and margin value found in the repository that does not land on that grid.
11. THE Design_Token_Spec SHALL define a typography micro-scale specifying letter-spacing for uppercase labels and eyebrow text, line-height per text role, and the font-weight mapping between Sora for headings and numerals and DM Sans for body and label text.
12. THE Design_Token_Spec SHALL specify tabular numeral formatting for calorie figures and macro figures so that displayed digits keep constant width when values update.
13. THE Design_Token_Spec SHALL state which typography rules yield to the existing `:lang(ar)`, `:lang(ur)`, and `:lang(ne)` font-family and line-height overrides in the Token_Source.
14. THE Design_Token_Spec SHALL define a button state matrix covering default, hover, active-pressed, disabled, and loading for the primary Emerald button and for the secondary and ghost buttons.
15. THE Design_Token_Spec SHALL define the active-pressed state as a scale reduction combined with a shadow reduction, in addition to any fill change.
16. THE Design_Token_Spec SHALL restrict hover states to a Pointer_Capable_Context so that a touch tap on the Android WebView does not leave an element stuck in its hover appearance.
17. THE Design_Token_Spec SHALL define one icon stroke width for the whole application, one icon size per usage context covering navigation, inline, and empty-state, and an optical alignment rule permitting adjustments of 1 to 2 pixels against the adjacent text baseline.
18. THE Design_Token_Spec SHALL define exactly one duration and easing pair for micro-interactions in the range of 150 milliseconds with an ease-out curve, and exactly one duration and easing pair for sheet and modal transitions in the range of 200 to 250 milliseconds.
19. THE Design_Token_Spec SHALL define the reduced-motion fallback for every motion token, so that a user who requests reduced motion receives no transform-based or opacity-based animation beyond the three scan animations and the desktop card-enter animation already covered today.
20. THE Design_Token_Spec SHALL require a minimum Touch_Target of 44 by 44 points for every Interactive_Element, including cases where the visible element is smaller than 44 points.
21. WHEN the Design_Token_Spec is complete, THE Orchestrator SHALL present the Design_Token_Spec to the user and SHALL wait for user approval before Phase 2 begins.

### Requirement 2: Component Inventory and Lane Assignment

**User Story:** As the delivery owner, I want every UI file inventoried and assigned to exactly one lane, so that parallel Builders never collide on the same file.

#### Acceptance Criteria

1. WHEN the Design_Token_Spec is approved, THE Orchestrator SHALL produce the Component_Inventory listing every file under `Frontend/src` that renders UI.
2. THE Component_Inventory SHALL cover the dashboard, scan and camera overlay, results card, history, compare, food database, trends, leaderboard, profile, feature requests, authentication, onboarding, paywall, navigation and tab bar, modals and sheets, empty states, loading states, and error states.
3. THE Component_Inventory SHALL group the listed files into 5 Builder_Lanes named to match the actual repository areas.
4. THE Component_Inventory SHALL assign each listed file to exactly one Builder_Lane.
5. IF a file appears in more than one Builder_Lane, THEN THE Orchestrator SHALL reassign that file to a single Builder_Lane before Phase 3 begins.
6. THE Component_Inventory SHALL record `Frontend/src/tailwind.css` as an Orchestrator-owned Token_Source that no Builder edits.
7. THE Component_Inventory SHALL record, for each listed file, the route or host screen on which the file renders.
8. THE Component_Inventory SHALL mark `Frontend/src/components/DashboardRedesign.jsx` and `Frontend/src/components/PaywallModal.jsx` as Unreferenced_Component entries.
9. THE Orchestrator SHALL exclude every Unreferenced_Component from Builder_Lane assignment and SHALL report the exclusion to the user for a keep-or-delete decision.
10. THE Component_Inventory SHALL record `Frontend/src/components/SignUp.css` as a Builder-editable style file assigned to the same Builder_Lane as `Frontend/src/components/SignUp.jsx`.

### Requirement 3: Non-Negotiable Change Constraints

**User Story:** As the codebase owner, I want the polish pass strictly bounded, so that a visual improvement can never introduce a functional regression.

#### Acceptance Criteria

1. THE Polish_Pass SHALL leave every Protected_Surface unchanged, including business logic, state management, data fetching, routing, and component props in and out.
2. THE Polish_Pass SHALL leave the color palette values, the font families, and the layout structure unchanged, WHERE layout structure means which element is a card, which element is a list, and which element is a tab.
3. THE Polish_Pass SHALL limit file edits to `className` values, Tailwind utility values, style token values, and the Token_Source.
4. WHERE a pseudo-state or transition requires a wrapper element, THE Builder SHALL modify JSX markup only to add that wrapper element.
5. IF a change requires a new npm dependency, THEN THE Builder SHALL stop and request user approval before adding the dependency.
6. THE Builder SHALL scope each individual change set to one component or one screen, at commit size.
7. THE Polish_Pass SHALL apply no repository-wide find-and-replace operation in a single pass.
8. THE Builder SHALL trace every change to a named rule in the Design_Token_Spec.
9. IF a proposed change has no corresponding rule in the Design_Token_Spec, THEN THE Builder SHALL reject the change and record the rejection.
10. THE Builder SHALL edit only files assigned to its own Builder_Lane.
11. IF a Builder identifies a required change in a file outside its own Builder_Lane, THEN THE Builder SHALL report the change to the Orchestrator instead of editing the file.

### Requirement 4: Builder Polish Pass

**User Story:** As a product designer, I want each lane systematically brought onto the token system, so that the whole app reads as one intentionally finished product.

#### Acceptance Criteria

1. WHEN a Builder begins work on its Builder_Lane, THE Builder SHALL re-read the Design_Token_Spec before editing any file.
2. THE Builder SHALL replace every One_Off_Value in its Builder_Lane with the corresponding Design_Token_Spec token for radius, border, shadow, and spacing.
3. THE Builder SHALL apply the Design_Token_Spec button state matrix to every button, card control, input, and icon button in its Builder_Lane.
4. WHERE an Interactive_Element in the Builder_Lane lacks a hover state, a pressed state, a disabled state, or a loading state defined by the Design_Token_Spec, THE Builder SHALL add the missing states.
5. THE Builder SHALL apply the Design_Token_Spec icon stroke width, context size, and optical alignment rule to every icon in its Builder_Lane.
6. WHERE an Interactive_Element changes appearance without a transition, THE Builder SHALL apply the Design_Token_Spec micro-interaction duration and easing pair.
7. WHERE a modal or sheet in the Builder_Lane animates, THE Builder SHALL apply the Design_Token_Spec sheet and modal duration and easing pair.
8. THE Builder SHALL apply the tabular numeral rule to every calorie figure and macro figure rendered in its Builder_Lane.
9. THE Builder SHALL produce a Change_Record for every modified file in its Builder_Lane.
10. THE Change_Record SHALL contain a before value, an after value, and one line of reason text naming the Design_Token_Spec rule for each change.
11. WHILE Builders work in parallel, THE Polish_Pass SHALL keep every Builder writing only to files in its own Builder_Lane.

### Requirement 5: Dark Mode Parity

**User Story:** As a user who runs the app in dark mode, I want dark mode to look deliberately designed, so that it does not read as an inverted copy of light mode.

#### Acceptance Criteria

1. WHEN a Builder changes a border value, a shadow value, or an elevation value, THE Builder SHALL verify the resulting appearance in both light mode and dark mode.
2. THE Builder SHALL assign dark-mode borders and dark-mode shadows their own Design_Token_Spec values rather than the light-mode value with a substituted color.
3. WHERE an element reads as elevated in light mode through a drop shadow, THE Builder SHALL express the same elevation in dark mode through a lighter border or glow treatment.
4. THE Change_Record SHALL state the light-mode value and the dark-mode value for every border, shadow, and elevation change.
5. IF a dark-mode value is missing for a changed border, shadow, or elevation, THEN THE Reviewer SHALL record a Finding against the owning Builder_Lane.

### Requirement 6: Accessibility Floor

**User Story:** As a user with accessibility needs, I want the polish pass to preserve and improve accessibility, so that a subtler visual treatment never reduces usability.

#### Acceptance Criteria

1. THE Polish_Pass SHALL give every Interactive_Element a Touch_Target of at least 44 by 44 points, including elements whose visible size is smaller than 44 points.
2. THE Polish_Pass SHALL keep the contrast ratio of text and of essential user interface boundaries at or above the WCAG AA threshold after every border-opacity change and text-opacity change.
3. THE Polish_Pass SHALL give every focusable element a visible keyboard focus indicator.
4. THE Reviewer SHALL verify contrast values and focus indicators against the Review_Checklist for every changed screen.
5. IF an Interactive_Element has a Touch_Target smaller than 44 by 44 points, THEN THE Reviewer SHALL record a Finding against the owning Builder_Lane.
6. IF a changed text or boundary color falls below the WCAG AA contrast threshold, THEN THE Reviewer SHALL record a Finding against the owning Builder_Lane.

### Requirement 7: Reviewer Gate

**User Story:** As the release owner, I want a reviewer gate that must reach zero findings, so that nothing half-polished ships.

#### Acceptance Criteria

1. WHEN a Builder completes its Builder_Lane, THE Reviewer SHALL re-read the Design_Token_Spec and audit every Change_Record from that Builder_Lane.
2. THE Reviewer SHALL verify that every radius value, shadow value, spacing value, and color value in each Change_Record resolves to a Design_Token_Spec token.
3. IF the Reviewer finds a One_Off_Value introduced by a change, THEN THE Reviewer SHALL record a Finding naming the file and the value.
4. THE Reviewer SHALL verify that light mode and dark mode each read as intentional for every changed screen.
5. THE Reviewer SHALL verify that every Interactive_Element on a changed screen has all states defined for that element type by the Design_Token_Spec button state matrix.
6. THE Reviewer SHALL verify cross-lane consistency, including that a single card elevation treatment is used across all screens.
7. THE Reviewer SHALL verify that every added transition and animation has the Design_Token_Spec reduced-motion fallback.
8. THE Reviewer SHALL verify that every added hover state is confined to a Pointer_Capable_Context.
9. IF two Builder_Lanes render the same element type with different token values, THEN THE Reviewer SHALL record a Finding against both Builder_Lanes.
10. THE Reviewer SHALL report results as a pass or fail entry per screen.
11. WHEN the Reviewer records a Finding, THE Reviewer SHALL route the Finding to the Builder that owns the affected file.
12. WHILE at least one open Finding exists, THE Polish_Pass SHALL repeat the Builder fix and Reviewer audit cycle.
13. THE Polish_Pass SHALL withhold sign-off until the Reviewer reports zero open Findings for every screen in the Component_Inventory.

### Requirement 8: Final Deliverables

**User Story:** As a reviewer of the finished work, I want a fixed set of output artifacts, so that I can confirm scope, rationale, and sign-off without reading every diff line by line.

#### Acceptance Criteria

1. THE Polish_Pass SHALL deliver the Design_Token_Spec as its own file or document section.
2. THE Polish_Pass SHALL deliver the per-screen Change_Record set containing before and after diffs with one line of reason text per change.
3. THE Polish_Pass SHALL deliver the final Reviewer report showing a pass entry for every screen and zero open Findings.
4. THE Polish_Pass SHALL deliver the Changelog_Artifact grouped by the categories radius, shadow, spacing, states, typography, icons, motion, and touch targets.
5. THE Changelog_Artifact SHALL group entries by category rather than by file.
6. THE Polish_Pass SHALL withhold the ship decision until the Reviewer report records sign-off.

### Requirement 9: Build and Regression Verification

**User Story:** As a maintainer, I want the polish pass verified against the existing build and test setup, so that a styling change cannot silently break the shipped SPA or the Cordova bundle.

#### Acceptance Criteria

1. WHEN a Builder completes a Builder_Lane, THE Polish_Pass SHALL run `npm run build` in `Frontend` and SHALL require the build to succeed.
2. WHEN a Builder completes a Builder_Lane, THE Polish_Pass SHALL run `npm run lint` in `Frontend` and SHALL require no new lint errors relative to the pre-change baseline.
3. WHEN a Builder changes a file that has a co-located test file, THE Polish_Pass SHALL run that test file through `npm test` in `Frontend` and SHALL require the pre-change pass or fail result to be unchanged.
4. THE Orchestrator SHALL capture the pre-change build, lint, and test baseline before Phase 3 begins, so that new failures can be distinguished from pre-existing ones.
5. WHEN the Token_Source changes, THE Polish_Pass SHALL run `npm run build:cordova` in `Frontend` and SHALL require the Cordova-mode build to succeed.
6. IF the build fails or a previously passing test fails after a change, THEN THE Builder SHALL revert or correct the change before the Reviewer audit continues.
7. THE Polish_Pass SHALL record the verification commands executed and their outcomes in the final Reviewer report.
