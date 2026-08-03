# bitezsnap — Product & Brand Brief (for logo design)

> **Purpose of this document.** It describes what the app does, who it is for, and the
> exact visual system it already uses (colours, fonts, icons, shapes, motion), so that a
> designer or an AI can propose a logo that fits the product instead of guessing.
>
> Everything below was read out of the actual codebase, not from marketing copy. Where the
> repo contradicts itself, that is flagged explicitly.

---

## 1. Identity at a glance

| Field | Value |
| --- | --- |
| Product name | **bitezsnap** |
| Android package id | `com.bitezsnap.app` |
| App label on device | `bitezsnap` |
| Tagline in the app manifest | "AI nutrition label scanning and analysis." |
| Domain used in metadata | `nutriscore.app` |
| Platforms | Responsive web app (browser) + Android app (Cordova WebView wrapping the same SPA). No iOS build configured. |
| Version | 1.0.0 (`android-versionCode 10000`) |
| Orientation | Portrait only on Android |
| Category | Health & nutrition / food scanning / AI assistant |

**Naming inconsistency worth resolving before the logo is made.** The repo folder is
`NutriScan-mainn`, the Android package id says `fitscoreai`, and the shipped product name
is `bitezsnap`. UI strings, the page `<title>`, the sidebar wordmark and the Cordova
`<name>` all say **bitezsnap**, so treat that as the real name. The wordmark in the
sidebar is rendered as `Nutri` + `Score` in two weights/colours, so a two-part lockup is
already implied.

---

## 2. What the product does (one paragraph)

bitezsnap is an AI nutrition scanner. You point your phone at a food package — a label,
an ingredients list, or a barcode — and it returns a single **health score from 0 to 10**
plus a plain-language verdict, an ingredient-by-ingredient breakdown (what's good for you,
what isn't), possible side effects, and healthier alternative products. Scans are saved to
a history, roll up into daily calorie/macro totals, and feed a long-term health-progress
chart. Scoring is personalised against a profile you fill in once (age, sex, height,
weight, medical conditions, allergies, health goal), so the same biscuit can score
differently for a diabetic user than for someone bulking.

---

## 3. Who it is for

- People who read labels but can't decode them — "is maltodextrin bad? how bad?"
- Users with a medical reason to care: diabetes, hypertension, cholesterol, allergies.
- Fitness users tracking calories and macros without wanting a full food-diary chore.
- Shoppers comparing two products in the aisle.
- Multilingual, notably South Asian and Arabic-speaking markets (see §7).

Tone the product speaks in: informed, calm, non-preachy. It gives a verdict
("Use caution", "Avoid") but explains why. It is not a guilt machine and not a
cartoon-mascot diet app.

---

## 4. Complete feature list

### 4.1 Scanning & analysis (the core)
- **Photo scan** — capture or upload a photo of a food label/package; AI (Google Gemini)
  reads it and returns a full analysis.
- **Barcode scan** — live camera barcode scanning (`html5-qrcode`), resolved against the
  **Open Food Facts** product database, then AI-analysed.
- **Food database search** — search the shared product database (products scanned by all
  users + Open Food Facts) and analyse a product without scanning anything.
- **Health score 0–10** shown in a large progress ring, with a five-band verdict:
  Safe to consume → Mostly safe → Use caution → High risk → Avoid.
- **Ingredient audit** — per-ingredient classification as beneficial / harmful / neutral,
  each with an explanation.
- **Side effects** list for the product.
- **Healthier alternatives** — suggested substitute products.
- **Serving-size editor** — adjust servings and every nutrition figure recalculates.
- **"Did you eat it?" confirmation** — a scan only counts toward daily nutrition and
  health progress after the user confirms they actually ate it.
- **Macro/nutrient breakdown** — calories, protein, carbs, fats, sodium.
- Long scans run as background jobs with a status endpoint, a live elapsed-seconds
  counter, and a cancel button.

### 4.2 Tracking & insight
- **Dashboard** — greeting, daily nutrition card, calendar strip to move between days,
  streak, scan quota bar, quick actions, recent scans.
- **Daily nutrition totals** with per-macro progress rings/bars against targets.
- **BMI card** — computed from the profile, banded (underweight / normal / overweight /
  obese) with its own colour scale.
- **Health Progress / Trends** — line and area charts (Recharts) of score and nutrition
  over time, with improving / declining / stable states.
- **History** — every past scan, paginated, re-openable, deletable.
- **Compare** — side-by-side comparison of two scanned products.
- **Streaks & points** — daily scanning streak and a points total.
- **Leaderboard** — streak ranking across users.

### 4.3 Account & personalisation
- Email + password sign-up/login, **Google Sign-In**, forgot-password and
  emailed reset-password flow.
- **Onboarding wizard** — age picker, sex, height, weight (kg/lb toggle), medical
  conditions, allergies, health goal.
- **Profile screen** grouped into areas: personal details, medical profile, health goals,
  language, dark mode, subscription, feature requests, support, terms, privacy, and
  account deletion.
- **Profile picture** (client-side compressed before upload).
- **Account deletion with a 7-day grace period** — logging back in cancels it.
- **Feature requests board** — users submit ideas and vote on them.

### 4.4 Monetisation
- **Free tier: 5 scans**, then a paywall.
- **Premium: unlimited scans** (fair-use capped internally).
- Plans: 7-day intro (₹50, first purchase only), Monthly (₹499), Yearly (₹4,800),
  Lifetime (₹15,000).
- **RevenueCat** in-app purchases on Android (`cordova-plugin-purchases`), **Razorpay**
  on web, plus a legacy direct Google Play Billing path in the backend.
- Web users hitting the paywall are pointed to the Android app.
- Quota bar visible in the sidebar and header at all times.

### 4.5 Platform & quality
- Same React SPA on web and inside the Android WebView (served from `https://localhost`
  so the camera is a secure context).
- **Light and dark mode**, class-based, applied before first paint so there is no flash.
- **8 languages with full RTL support** (see §7).
- Accessibility floor is enforced in the design system: 4.5:1 text contrast in both
  modes, visible focus rings, 44×44px minimum touch targets, and colour is never the only
  carrier of meaning (every colour is paired with a distinct icon).
- Camera and internet permissions only; cleartext traffic disabled, backup disabled.

---

## 5. Colour system (exact values — this is what a logo must sit beside)

### 5.1 Brand core

The identity is **emerald green**. It is the single accent for actions, the brand mark
background, the score ring, the FAB and the primary button.

| Role | Hex | Notes |
| --- | --- | --- |
| **Primary (brand emerald)** | `#10B981` | The brand colour. Splash logo tile is this. |
| Primary pressed / text-safe | `#059669` | Used wherever emerald must carry small text on white (`#10B981` is only ~2.3:1 on white, so it is never used for small light-mode text). |
| Secondary (deep green) | `#047857` | |
| Secondary container (deepest green) | `#065F46` | Eyebrow labels, deep accents. |
| Tertiary (sky blue) | `#0EA5E9` | Informational accent only, not brand. |
| Tertiary pressed | `#0284C7` | |
| On-primary (text on emerald) | `#FFFFFF` | |

### 5.2 Light mode surfaces

| Token | Hex |
| --- | --- |
| Page background | `#F5F5F5` (design spec calls for a slightly green-shifted `#EBEEEC`) |
| Card / sheet | `#FFFFFF` |
| Surface low (tinted) | `#ECFDF5` |
| Surface container | `#D1FAE5` |
| Surface high | `#A7F3D0` |
| Surface highest | `#6EE7B7` |
| Text primary | `#1A1A1A` |
| Text secondary | `#374151` |
| Outline / muted text | `#6B7280` |
| Hairline border | `#EBEBEB` / `rgba(15,23,42,0.08)` |
| Splash screen background (Android) | `#F5F5F5` |

### 5.3 Dark mode surfaces

Emerald does **not** change between modes — only the neutrals do. A logo must read on both
`#F5F5F5` and `#111111`.

| Token | Hex |
| --- | --- |
| Page background | `#111111` |
| Card | `#1C1C1E` |
| Surface low | `#1A1A1A` |
| Surface high | `#292929` |
| Text primary | `#FFFFFF` |
| Text secondary | `#D1D5DB` |
| Outline | `#ADADAD` |
| Hairline border | `rgba(255,255,255,0.10)` |

### 5.4 Semantic colours (meaning-carrying, never decorative)

**Score bands** (how healthy is this food) — also reused for ingredient impact:

| Band | Light | Dark |
| --- | --- | --- |
| Great (≥8) | `#059669` | `#34D399` |
| Good (≥6) | `#10B981` | — |
| Caution (≥4) | `#B45309` | `#FBBF24` |
| Risk (≥2) | `#EA580C` | — |
| Avoid (<2) | `#DC2626` | `#F87171` |

**Trend:** improving `#059669` / declining `#DC2626` / stable `#4B5563` (grey — "no
movement" is deliberately not a third accent).

**BMI bands:** underweight `#0284C7` (informational blue), normal / over / obese reuse the
score greens, ambers and reds.

**Nutrient categories** — one accent *and* one icon per nutrient, so the category survives
greyscale and colour-blindness:

| Nutrient | Icon | Light | Dark |
| --- | --- | --- | --- |
| Calories | Flame | `#C2410C` | `#FB923C` |
| Protein | Beef | `#9F1239` | `#FB7185` |
| Carbs | Wheat | `#A16207` | `#D9BE8C` |
| Fats | Droplet | `#1D4ED8` | `#60A5FA` |
| Sodium | Shell | `#6D28D9` | `#C4B5FD` |

**Error:** `#EF4444` (container `#FEE2E2` light / `#7F1D1D` dark).
**Warning:** `#F59E0B`. **Success:** `#5BAD4E`.

### 5.5 Colour rules the logo should respect
- Emerald `#10B981` is the one brand colour. Blue, purple and orange in the app are
  *semantic*, not brand — a logo using them would read as a status, not an identity.
- Amber and red are spoken for: they mean "caution" and "avoid". A red or amber logo would
  fight the product's own scoring language.
- Purple is not part of this palette at all.

---

## 6. Typography, shape, icon and motion language

**Fonts (already loaded, Google Fonts):**
- **Sora** — display and headline face. Weights 700/800. Used for the wordmark-adjacent
  headings, screen titles, and all big numbers (score, calories). Tight tracking
  (`-0.01em` to `-0.02em`) on large sizes. Geometric, slightly technical, rounded
  terminals. **This is the font a wordmark should be built from or harmonise with.**
- **DM Sans** — body and UI face. Weights 400/500/700/800. Uppercase labels always carry
  ≥`0.08em` tracking (`0.12em` for eyebrows), which gives the UI a spaced, clinical
  caption style.
- Script fallbacks: Cairo / Noto Sans Arabic (ar), Noto Nastaliq Urdu (ur), Noto Sans
  Devanagari (ne, hi).
- All in-place numbers use tabular figures.

**Shape language — corner radius scale (nothing off this list exists in the app):**
`8px` chips · `12px` inputs and small buttons · `16px` buttons and day cells ·
`20px` cards and sheets · `28px` phone-shell containers · `999px` pills, avatars, FAB.
The splash logo tile is a `24px`-radius **squircle**. So the product's shape vocabulary is
**soft-cornered squares and full circles** — no sharp 90° corners, no long thin spikes.

**Icon system:** `lucide-react` exclusively, `strokeWidth={2}`, one size per context
(22 nav · 20 toolbar · 18 badge · 16 inline · 14 chip · 26 FAB · 32 empty state · 48 hero).
The visual result is **uniform 2px-stroke line icons**, never filled glyphs, never mixed
weights. Icons appear inside circular/squircle badges tinted at 12% of their own accent.

**Elevation:** soft, wide, low-opacity multi-stop shadows. In dark mode elevation is
carried by a 1px inset top highlight instead of a shadow. Nothing in the UI is hard-edged
or heavily outlined; the emerald CTA gets a soft emerald glow
(`0 10px 24px -8px` at 45% emerald).

**Motion:** 150ms micro-interactions, 220ms overlays, 700ms for data figures (rings
filling), easing `cubic-bezier(0.22, 1, 0.36, 1)`; one playful `ease-pop` reserved for the
calendar day-select. Restrained, quick, not bouncy.

---

## 7. Languages & script constraints

Eight UI languages, each labelled with its own endonym:
English, Français, عربي (Arabic), اردو (Urdu), नेपाली (Nepali), हिन्दी (Hindi),
Deutsch, Español.

Arabic and Urdu run **right-to-left** — the whole layout mirrors. Practical consequence for
the logo: a mark whose meaning depends on left-to-right reading direction (an arrow moving
right, a progress bar filling rightward) will read backwards for RTL users. A
**direction-neutral or radial mark is safer**, and a Latin wordmark should be separable
from the symbol so the symbol can stand alone in RTL and in app-icon contexts.

---

## 8. Current logo assets (what exists today, and why it needs replacing)

- **Splash / in-app mark:** a white leaf-and-stem glyph, hand-drawn as inline SVG, centred
  on an emerald `#10B981` squircle with a soft emerald glow. This is the closest thing to
  a real logo and is the visual most users see first.
- **Sidebar wordmark:** text only — `Nutri` + `Score`, Sora, split into two spans so the
  two halves can be styled differently.
- **Header brand mark:** a lucide `Apple` icon at 20px inside an emerald tile — a
  placeholder, not a logo.
- **`Frontend/public/favicon.svg`:** an unrelated **purple/blue** abstract lightning-bolt
  mark (`#863bff`, `#7e14ff`, `#47bfff`) left over from a different project. It matches
  nothing in the palette and should be replaced.
- **Android launcher icons:** adaptive icon (`foreground` + `background` PNG layers) plus a
  legacy square fallback, generated at ldpi→xxxhdpi by a `npm run gen:res` script from a
  source logo. **A new logo therefore needs to work as an adaptive-icon foreground on a
  flat background layer, safe inside the circular mask.**
- **Splash icon:** `res/android/splash/splash-icon.png` on a `#F5F5F5` background — so the
  mark must also read on a *light* background, not only on emerald.

---

## 9. Concrete brief for the logo

**What the logo has to say:** a score, derived from food, that you can trust at a glance.
The two ideas the product is actually built on are **(a) scanning/reading** and **(b) a
single number verdict on a 0–10 dial**. The score ring is the app's most distinctive
existing visual.

**Hard requirements**
1. Works as a **square app icon** at 48px and as an Android **adaptive icon** foreground
   (safe zone: the centre ~66% of the canvas survives the circular mask).
2. Legible as a 1-colour silhouette — white on `#10B981`, and emerald on `#F5F5F5`
   *and* on `#111111`.
3. Uses the emerald family (`#10B981` / `#059669` / `#047857`) as its colour. If a second
   colour is needed, `#FFFFFF` or a near-black neutral — not amber, not red, not purple.
4. Geometry consistent with the app: soft corners (8–28px radius family at UI scale),
   circles, and 2px-equivalent uniform stroke weight if the mark is linear.
5. Direction-neutral, so it does not invert in meaning in Arabic/Urdu RTL layouts.
6. Separable **symbol** + **wordmark** lockup. The wordmark should be Sora-based (or
   harmonise with Sora), and should support the existing two-tone `Nutri`+`Score` split.
7. Distinguishable from the two obvious clichés in this category: a plain apple silhouette,
   and a generic barcode.

**Directions worth exploring** (not prescriptive)
- The **score ring** itself as the mark — an open circular arc with a gap, the gap doubling
  as a scanner opening or a bite.
- A **leaf inside a ring/dial**, evolving the existing splash leaf into something
  geometric rather than hand-drawn.
- A **scan bracket** (the four corner ticks of a viewfinder) framing a leaf or a numeral.
- An abstract **"N"** built from a rising bar/step form, since the product's other core
  screen is a progress trend.
- A leaf whose midrib is a **subtle checkmark**, tying "natural" to "verified".

**Deliverables to ask for**
- Symbol only, SVG, 1-colour and full-colour.
- Horizontal lockup (symbol + wordmark) and stacked lockup.
- App icon: 512×512 master, adaptive foreground + background layers.
- `favicon.svg` replacement.
- Splash mark on `#F5F5F5`.
- Light-mode and dark-mode variants.

---

## 10. Technical stack (context only)

| Layer | Technology |
| --- | --- |
| Web frontend | React 19, Vite, React Router 7, Tailwind CSS v4 (no config file — tokens live in `@theme` + CSS custom properties), Recharts, Framer Motion, lucide-react, i18next, html5-qrcode |
| Backend | Node.js + Express, PostgreSQL, background job queue, Cloudinary (images), rate limiting, CSRF, JWT in HttpOnly cookies (Bearer replay inside the WebView) |
| AI | Google Gemini for label and product analysis |
| External data | Open Food Facts |
| Mobile | Apache Cordova (cordova-android 15), minSdk 24 / target 36; plugins: android-permissions, secure-storage, purchases (RevenueCat) |
| Payments | RevenueCat (Android), Razorpay (web), legacy Google Play Billing (backend) |

---

*Sources: `mobile/config.xml`, `Frontend/src/tailwind.css`, `Frontend/DESIGN_TOKENS.md`,
`Frontend/src/App.jsx`, `Frontend/src/utils/{scoreColor,macroMeta,languages}.js`,
`Backend/config/plans.js`, `Backend/routes/*.js`, `Backend/utils/scanQuota.js`,
`Frontend/package.json`, `mobile/package.json`, `Frontend/public/favicon.svg`.*
