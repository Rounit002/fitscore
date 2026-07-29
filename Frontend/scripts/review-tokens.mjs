/**
 * Phase 4 reviewer pass — audits the codebase against DESIGN_TOKENS.md.
 * Reports pass/fail per check. Exit code 1 if any check fails.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('src/tailwind.css', 'utf8');
const dir = 'src/components';
const files = readdirSync(dir).filter((f) => f.endsWith('.jsx') && !f.includes('.test.'));
// DashboardRedesign is an unrouted mockup with its own private theme; excluded
// from the pass by decision recorded in UI_POLISH_INVENTORY.md section 4.
const inScope = files.filter((f) => f !== 'DashboardRedesign.jsx');
const jsx = Object.fromEntries(inScope.map((f) => [f, readFileSync(join(dir, f), 'utf8')]));

const results = [];
const check = (name, failures, note = '') => {
  results.push({ name, failures, note });
};

// 1. Broken arbitrary values (space inside brackets never compiles).
const broken = [];
for (const [f, s] of Object.entries(jsx)) {
  for (const m of s.matchAll(/(?:shadow|bg|ring|border|text)-\[[^\]]*,\s[^\]]*\]/g)) {
    broken.push(`${f}: ${m[0]}`);
  }
}
check('No space-containing arbitrary Tailwind values (silently dead CSS)', broken);

// 2. Radius scale: no off-scale border-radius left in CSS.
const ALLOWED = ['8px', '12px', '16px', '20px', '28px', '999px', '50%', 'inherit'];
const offScale = [];
for (const m of css.matchAll(/border-radius:\s*([^;!}\n]+)/g)) {
  const v = m[1].trim();
  if (ALLOWED.includes(v)) continue;
  if (v.startsWith('var(')) continue;          // token reference
  if (/^[\d.]+px\s+/.test(v) || v.startsWith('0 ')) continue; // directional shape
  offScale.push(v);
}
check('Every CSS border-radius maps to the radius scale', [...new Set(offScale)]);

// 3. No arbitrary rounded-[Npx] left in in-scope JSX.
const arbRadius = [];
for (const [f, s] of Object.entries(jsx)) {
  for (const m of s.matchAll(/rounded-\[[^\]]+\]/g)) arbRadius.push(`${f}: ${m[0]}`);
}
check('No arbitrary rounded-[Npx] in JSX', arbRadius);

// 4. Border widths: 1.5px is not one of the three treatments.
const oddBorders = [...css.matchAll(/border(?:-\w+)?:\s*1\.5px/g)].map((m) => m[0]);
check('No 1.5px borders (only 1px hairline / 2px bold exist)', oddBorders);

// 5. Both colour modes define every elevation + edge token.
const lightScope = css.slice(css.indexOf(':root {'), css.indexOf('html.dark {'));
const darkScope = css.slice(css.indexOf('html.dark {'));

// A token can be redeclared later in the file, and the last declaration is the
// one that actually applies. Checks that assert on a *value* must therefore read
// the winning declaration, not the first one, or they audit dead CSS.
const winningValue = (scopeSelector, token) => {
  const re = new RegExp(`${scopeSelector}\\s*\\{[^}]*?${token}:\\s*([^;}]+)`, 'g');
  let last;
  for (const m of css.matchAll(re)) last = m[1].trim();
  return last;
};
const needed = ['--elev-rest', '--elev-raised', '--elev-floating', '--elev-pressed', '--edge-hairline'];
const missingMode = [];
needed.forEach((t) => {
  if (!lightScope.includes(t + ':')) missingMode.push(`light missing ${t}`);
  if (!darkScope.includes(t + ':')) missingMode.push(`dark missing ${t}`);
});
check('Light and dark each define their own elevation/edge values', missingMode);

// 6. Dark mode must not rely on a black shadow (invisible on #111).
const darkElev = darkScope.match(/--elev-(rest|raised|floating):[^;]+/g) || [];
const noInset = darkElev.filter((d) => !d.includes('inset'));
check('Dark elevation uses an inset highlight, not only a black shadow', noInset);

// 7. Keyboard focus exists globally.
check('Global :focus-visible rule present', css.includes(':focus-visible') ? [] : ['missing']);

// 8. The dark-mode invisible-border bug is fixed.
const darkBtnBorder = darkScope.match(/--ns-button-border:\s*([^;]+)/);
check(
  'Dark --ns-button-border is not a near-black value',
  darkBtnBorder && /rgba\(0,\s*0,\s*0/.test(darkBtnBorder[1]) ? [darkBtnBorder[1].trim()] : [],
);

// 9. Tabular numerals declared.
check('Tabular numerals declared in the CSS layer',
  css.includes('font-variant-numeric') ? [] : ['missing']);

// 10. Reduced motion covers more than the scan beam.
check('Reduced-motion guard applies app-wide',
  (css.match(/prefers-reduced-motion/g) || []).length >= 2 ? [] : ['only scoped to scan beam']);

// 11. Every screen's primary action carries an edge (no fill-only primaries).
// DESIGN_TOKENS.md rule 4 exempts two cases: a full-bleed decorative panel
// (nothing to separate it from), and an element nested inside a parent that
// already carries the edge (e.g. the shutter's inner disc).
const EXEMPT = [
  'flex-[1.2]',          // Login/SignUp full-height brand panel
  'group-active:scale',  // inner disc of the shutter button
];
const fillOnly = [];
for (const [f, s] of Object.entries(jsx)) {
  for (const m of s.matchAll(/className="[^"]*bg-ns-primary[^"]*"/g)) {
    const cls = m[0];
    if (EXEMPT.some((e) => cls.includes(e))) continue;
    const hasEdge = /edge-highlight|edge-hairline|edge-bold|border-/.test(cls);
    if (!hasEdge) fillOnly.push(`${f}: ${cls.slice(0, 90)}`);
  }
}
check('No bg-ns-primary element without an edge treatment', fillOnly);

// 12. At most one .edge-highlight per component file.
const multiHighlight = [];
for (const [f, s] of Object.entries(jsx)) {
  const n = (s.match(/edge-highlight(?!-sm)/g) || []).length;
  if (n > 1) multiHighlight.push(`${f}: ${n} highlighted edges`);
}
check('At most one highlighted edge per screen', multiHighlight);

// ── Round-2 findings (brief section 0.6) ──

// 13. Cross-mode shape parity: a dark-mode rule may change colour only. If a
// `html.dark` block sets a structural property, light and dark have drifted in
// shape, which the brief classes as a bug rather than a style choice.
const SHAPE_PROPS = ['border-radius', 'border-width', 'width', 'height', 'padding', 'margin'];
const shapeDrift = [];
for (const m of css.matchAll(/html\.dark\s+([^{]+)\{([^}]*)\}/g)) {
  const [, selector, body] = m;
  for (const prop of SHAPE_PROPS) {
    // `border:` shorthand carries a colour, so only flag an explicit width.
    if (new RegExp(`(^|[;\\s])${prop}\\s*:`).test(body)) {
      shapeDrift.push(`${selector.trim().slice(0, 60)} sets ${prop}`);
    }
  }
}
check('Dark mode changes colour only, never shape (cross-mode parity)', shapeDrift);

// 14. Semantic colour map: meaning-carrying colour is defined once and
// referenced, never re-picked per component. Raw score/trend hexes in JSX are
// how the same word ended up two different colours on one screen.
const BAND_HEXES = /#(5BAD4E|F59E0B|EF4444|3b82f6|ba1a1a|8BC34A)\b/gi;
// Onboarding/ErrorBoundary use emerald as brand chrome, not as score meaning.
const SEMANTIC_SCOPE = ['Trends.jsx', 'Results.jsx', 'Compare.jsx', 'History.jsx', 'Dashboard.jsx'];
const rePicked = [];
for (const f of SEMANTIC_SCOPE) {
  for (const m of (jsx[f] || '').matchAll(BAND_HEXES)) rePicked.push(`${f}: ${m[0]}`);
}
check('Score/trend colour is never re-picked as a raw hex in JSX', rePicked);

// The CSS map and the JS helper are two mirrors of the same decision, so they
// must agree. A drift here is silent: each file looks self-consistent.
const util = readFileSync('src/utils/scoreColor.js', 'utf8');
const mirrorDrift = [];
for (const [cssVar, jsKey] of [
  ['--sem-score-good', 'great'],
  ['--sem-score-avg', 'caution'],
  ['--sem-score-bad', 'avoid'],
]) {
  const cssVal = winningValue(':root', cssVar);
  const jsVal = util.match(new RegExp(`${jsKey}:\\s*'(#[0-9A-Fa-f]{6})'`))?.[1];
  if (!cssVal || !jsVal) mirrorDrift.push(`${cssVar} / ${jsKey}: value not found`);
  else if (cssVal.toLowerCase() !== jsVal.toLowerCase()) {
    mirrorDrift.push(`${cssVar}=${cssVal} but SCORE_COLORS.${jsKey}=${jsVal}`);
  }
}
check('CSS semantic map and scoreColor.js agree on every band', mirrorDrift);

// Every band must be visually distinct, or two different meanings render the
// same. The previous util returned one colour for both >= 8 and >= 6.
const bandValues = [...util.matchAll(/(great|good|caution|risk|avoid):\s*'(#[0-9A-Fa-f]{6})'/g)]
  .map((m) => m[2].toLowerCase());
const dupBands = bandValues.filter((v, i) => bandValues.indexOf(v) !== i);
check('No two score bands share a colour', [...new Set(dupBands)]);

// 15. Light mode needs a real gap between page and card, or cards dissolve into
// the background and no edge treatment can rescue them.
const pageBg = winningValue(':root', '--ns-page-bg');
const cardBg = winningValue(':root', '--ns-card-bg');
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const gap = pageBg && cardBg ? lum(cardBg) - lum(pageBg) : 0;
check(
  'Light page background is a deliberate step below card white',
  gap >= 0.05 ? [] : [`page ${pageBg} vs card ${cardBg}: luminance gap ${gap.toFixed(3)} < 0.05`],
);

// ── Round-3 findings (brief section 0.7) ──

// 16. One accent per data category. A screen showing several distinct
// categories side by side must not paint them all the same colour, or the
// badges identify nothing and read as decoration.
const MACROS = ['calories', 'protein', 'carbs', 'fats', 'sodium'];
const macroLight = MACROS.map((k) => [k, winningValue(':root', `--sem-macro-${k}`)]);
const macroDark = MACROS.map((k) => [k, winningValue('html\\.dark', `--sem-macro-${k}`)]);
const macroMissing = [...macroLight, ...macroDark]
  .filter(([, v]) => !v)
  .map(([k]) => `--sem-macro-${k} missing in one mode`);
check('Every macro category has its own accent token in both modes', macroMissing);

const macroDupes = [];
for (const set of [macroLight, macroDark]) {
  const vals = set.map(([, v]) => (v || '').toLowerCase());
  vals.forEach((v, i) => {
    if (v && vals.indexOf(v) !== i) macroDupes.push(`${set[i][0]} reuses ${v}`);
  });
}
check('No two macro categories share an accent', macroDupes);

// A category accent must not collide with a score/trend band, or "carbs" and
// "caution" render identically and categorical colour starts reading as a
// judgement — the exact confusion the two scales were separated to avoid.
const bandVals = ['--sem-score-good', '--sem-score-avg', '--sem-score-bad'].flatMap((t) => [
  (winningValue(':root', t) || '').toLowerCase(),
  (winningValue('html\\.dark', t) || '').toLowerCase(),
]);
const collide = [...macroLight, ...macroDark]
  .filter(([, v]) => v && bandVals.includes(v.toLowerCase()))
  .map(([k, v]) => `--sem-macro-${k} (${v}) is also a score band colour`);
check('Category accents never collide with a score band colour', collide);

// Category colour is small label text, so it carries the AA text floor. Light
// values are measured on the card surface, dark values on the dark card.
const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rlum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => srgb(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [rlum(a), rlum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const lowContrast = [];
for (const [scope, set] of [['light', macroLight], ['dark', macroDark]]) {
  const surface = scope === 'light' ? '#FFFFFF' : (winningValue('html\\.dark', '--ns-card-bg') || '#1C1C1E');
  for (const [k, v] of set) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(v || '')) continue;
    const r = contrast(v, surface);
    if (r < 4.5) lowContrast.push(`${scope} --sem-macro-${k} ${v}: ${r.toFixed(2)}:1 < 4.5`);
  }
}
check('Category accents meet AA as small text on their own surface', lowContrast);

// 17. Category meaning must not be colour-only: every entry in the shared macro
// map needs a glyph (or at minimum a letter) alongside its accent.
const macroMap = readFileSync('src/utils/macroMeta.js', 'utf8');
const colourOnly = [];
for (const m of macroMap.matchAll(/(\w+):\s*\{([^}]*)\}/g)) {
  const [, key, body] = m;
  if (!MACROS.includes(key)) continue;
  if (!/icon:/.test(body) || !/letter:/.test(body)) colourOnly.push(`${key} has no non-colour marker`);
}
check('Category colour is always paired with a glyph or letter', colourOnly);

// 18. Emoji are not an icon system: they ignore colour mode, share no stroke
// weight with lucide, and render differently per platform.
const emoji = [];
for (const [f, s] of Object.entries(jsx)) {
  for (const m of s.matchAll(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)) emoji.push(`${f}: ${m[0]}`);
}
check('No emoji standing in for an icon in JSX', emoji);

// 19. The ring is shared, not reimplemented. Two copies of "value against a
// goal" would be two chances to disagree about what a full ring looks like.
const ownRing = [];
for (const [f, s] of Object.entries(jsx)) {
  if (f === 'ProgressRing.jsx') continue;
  if (/strokeDasharray/.test(s) && !/from '\.\/ProgressRing/.test(s)) {
    ownRing.push(`${f}: draws its own progress arc`);
  }
}
check('Progress arcs come from the shared ProgressRing', ownRing);

// 20. Empty states teach the feature. A "nothing here yet" state on a list of
// cards should preview the card, not just describe its absence.
const PREVIEW_EXPECTED = ['Dashboard.jsx', 'History.jsx'];
const plainEmpty = PREVIEW_EXPECTED.filter((f) => !/EmptyPreview/.test(jsx[f] || ''));
check('Card-list empty states render a preview, not text alone', plainEmpty);

// 21. Icon sizes: one value per context, no in-between. The app had 19 distinct
// sizes, which is what makes two icons beside each other look misaligned when
// each is individually fine.
const ICON_SIZES = [14, 16, 18, 20, 22, 26, 32, 48];
const offSize = [];
for (const [f, s] of Object.entries(jsx)) {
  s.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/size=\{(\d+)\}/g)) {
      if (!ICON_SIZES.includes(Number(m[1]))) offSize.push(`${f}:${i + 1} size={${m[1]}}`);
    }
  });
}
check('Every icon size is one of the per-context values', offSize);

// 22. An icon badge must not be tinted one hue and drawn in another. Deriving
// both from a single --edge-accent is what makes that impossible; a rule that
// sets `background` and `color` to unrelated values is the bug this catches
// (.delete-success-icon-wrap was emerald-tinted behind amber text).
// Only chromatic-vs-chromatic counts. A badge that is *filled* with its accent
// and draws the glyph in white/on-primary is the intended pattern (TOKENS 7), as
// is a neutral surface tint with neutral text; neither is a hue disagreement.
const NEUTRAL = /^(--ns-(on-)?surface|--ns-on-primary|--ns-card-bg|--ns-input-bg|--ns-outline|--ns-shell-bg|--ns-page-bg|#fff|#ffffff|255,\s*255,\s*255)/i;
// Dead legacy rules are reported separately (see the DEAD_CSS check) rather than
// polished: editing CSS that renders on no screen is churn, and deleting it is a
// wider change than a styling pass should make unilaterally.
const allJsx = Object.values(jsx).join('\n') + readFileSync('src/App.jsx', 'utf8');
const isLive = (sel) => allJsx.includes(sel);
const BADGE_RE = /\.([\w-]*(?:icon|mark|avatar)[\w-]*)\s*\{([^}]*)\}/g;
const splitHue = [];
for (const m of css.matchAll(BADGE_RE)) {
  const [, sel, body] = m;
  if (!isLive(sel)) continue;
  const bg = body.match(/(?:^|[;\s])background:\s*([^;]+)/)?.[1];
  const fg = body.match(/(?:^|[;\s])color:\s*([^;]+)/)?.[1];
  if (!bg || !fg) continue;
  const hueOf = (v) => (v.match(/--sem-[\w-]+|--ns-[\w-]+|--edge-accent|#[0-9A-Fa-f]{3,6}|\d+,\s*\d+,\s*\d+/) || [''])[0];
  const a = hueOf(bg);
  const b = hueOf(fg);
  if (!a || !b || a === b) continue;
  if (NEUTRAL.test(a) || NEUTRAL.test(b)) continue;
  splitHue.push(`.${sel}: tint ${a} vs glyph ${b}`);
}
check('No icon badge is tinted one hue and drawn in another', splitHue);

// 23. Meaning-carrying colour in CSS must reference the semantic map, not a raw
// hex. A literal cannot respond to colour mode, so dark mode silently inherits
// the light value — which is how pre-round-2 hexes survived in badge rules.
const STALE = /#(10B981|EF4444|3b82f6|F59E0B|5BAD4E|ba1a1a)\b/gi;
const staleHex = [];
const deadStale = [];
for (const m of css.matchAll(/\.([\w-]*(?:icon|mark|badge|chip|avatar|score)[\w-]*)[^{]*\{([^}]*)\}/g)) {
  const [, sel, body] = m;
  for (const h of body.matchAll(STALE)) {
    (isLive(sel) ? staleHex : deadStale).push(`.${sel}: ${h[0]}`);
  }
}
check('Status/category CSS references the semantic map, not a stale raw hex', [...new Set(staleHex)]);

// Reported, not failed: these rules render on no screen, so their stale values
// cannot affect the UI. Listing them keeps them from being mistaken for live
// code by the next pass, and flags them for a keep-or-delete decision.
if (deadStale.length) {
  results.push({ name: `NOTE  ${new Set(deadStale).size} stale value(s) in unreferenced legacy CSS (no screen renders these)`, failures: [], note: [...new Set(deadStale)].join(', ') });
}

// 24. Settings rows are grouped by area, not all one colour and not all
// different. Every row carrying the same accent means the badge column holds no
// information; a distinct accent per row is a paint chart.
const areas = [...(jsx['Profile.jsx'] || '').matchAll(/area="(\w+)"/g)].map((m) => m[1]);
const areaSet = new Set(areas);
const areaProblems = [];
if (areas.length === 0) areaProblems.push('no group accents assigned');
else if (areaSet.size < 2) areaProblems.push('every row shares one accent — badge column carries no information');
else if (areaSet.size > 5) areaProblems.push(`${areaSet.size} distinct accents — grouping has collapsed into per-row colour`);
for (const a of areaSet) {
  if (!winningValue(':root', `--sem-area-${a}`)) areaProblems.push(`--sem-area-${a} is not defined`);
}
check('Settings rows use grouped area accents (2-5 groups, all defined)', areaProblems);

// Area accents carry the same AA floor and the same no-collision rule as the
// macro categories, since they are used as small-glyph colour on a card.
const AREAS = [...areaSet];
const areaColour = [];
for (const scope of ['light', 'dark']) {
  const sel = scope === 'light' ? ':root' : 'html\\.dark';
  const surface = scope === 'light' ? '#FFFFFF' : (winningValue('html\\.dark', '--ns-card-bg') || '#1C1C1E');
  for (const a of AREAS) {
    const v = winningValue(sel, `--sem-area-${a}`);
    if (!v) { areaColour.push(`${scope} --sem-area-${a} missing`); continue; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(v)) continue;
    const r = contrast(v, surface);
    if (r < 4.5) areaColour.push(`${scope} --sem-area-${a} ${v}: ${r.toFixed(2)}:1 < 4.5`);
    if (bandVals.includes(v.toLowerCase())) areaColour.push(`${scope} --sem-area-${a} collides with a score band`);
  }
}
check('Area accents meet AA and never collide with a score band', areaColour);

// ── Round-4 findings (auth + onboarding) ──

// 25. Inline style objects are the reviewer's blind spot, and the blind spot is
// where the worst screen in the app survived three passes. Every check above
// reads className strings or tailwind.css, so a component built from
// `style={{ borderRadius: 50, background: '#4CAF50' }}` scored a clean sheet
// while honouring none of the system.
//
// What is flagged is a hardcoded *literal*: a raw hex, an rgb()/rgba() triple, or
// a px/rem length. Such a value cannot respond to `html.dark` (there is no
// cascade to override it), so it pins one mode's appearance into both — the exact
// mechanism that kept the whole signup funnel light while the app switched.
//
// What is allowed is a value the stylesheet genuinely cannot express:
//   - a token reference, `var(--sem-streak)`, which is how the semantic map is
//     threaded through JS by design (TOKENS 14.1);
//   - a computed accent from that map, `color: tone` / `background: accent`;
//   - a per-render geometry or fluid size, `width: ${pct}%` / `clamp(...)`.
// Those are dynamic, mode-aware, and have no class equivalent.
// Narrowed to literal *colour*. A literal length is mode-independent by nature —
// `border: '3px solid var(--ns-surface-high)'` states a width inline but still
// takes its colour from the cascade, so it follows the mode correctly and is not
// the bug this check exists to find.
const COLOUR_LITERAL = /(?:background|backgroundColor|borderColor|borderTopColor|color|boxShadow)\s*:\s*(?:'|"|`)?\s*(?:#[0-9A-Fa-f]{3,8}\b|rgba?\(\s*\d)/;
const inlineLiteral = [];
for (const [f, s] of Object.entries(jsx)) {
  s.split('\n').forEach((line, i) => {
    if (!/style=\{\{/.test(line)) return;
    // Isolate the object body so a literal elsewhere on the line is not blamed.
    const body = line.slice(line.indexOf('style={{') + 8);
    if (COLOUR_LITERAL.test(body)) inlineLiteral.push(`${f}:${i + 1}`);
  });
}
check('No inline style hardcodes a colour literal (cannot follow colour mode)', inlineLiteral);

// 26. A component-local <style> block is a second stylesheet outside the token
// layer. Onboarding used one to push Material green into the already-polished
// Medical / Health Goals screens with !important, silently undoing rounds 1-3 on
// those two pages — a regression no check could see because it lived in a
// template literal.
const localSheets = [];
for (const [f, s] of Object.entries(jsx)) {
  if (/<style>/.test(s)) localSheets.push(f);
}
check('No component ships its own <style> block', localSheets);

// 27. Mojibake: UTF-8 bytes that were read as latin1 and re-encoded. The gender
// options rendered as a literal "ðŸ‘©" on the signup funnel, and the emoji check
// above could not see it because the corrupted bytes no longer match an emoji
// range. Any of these sequences in source is a broken glyph on screen.
const MOJIBAKE = /Ã[\u0080-\u00BF]|â[\u0080-\u00BF]{2}|ð[\u0178\u0080-\u00BF]/g;
const corrupted = [];
for (const [f, s] of Object.entries(jsx)) {
  s.split('\n').forEach((line, i) => {
    if (MOJIBAKE.test(line)) corrupted.push(`${f}:${i + 1}`);
  });
}
check('No mojibake (mis-decoded UTF-8) in source', corrupted);

// Report
let failed = 0;
console.log('\n═══ Phase 4 Reviewer Pass ═══\n');
for (const r of results) {
  const ok = r.failures.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.name}`);
  if (!ok) r.failures.slice(0, 12).forEach((x) => console.log(`        - ${x}`));
  if (r.failures.length > 12) console.log(`        ... +${r.failures.length - 12} more`);
}
console.log(`\n${results.length - failed}/${results.length} checks passing`);
process.exit(failed ? 1 : 0);
