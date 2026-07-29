/**
 * Cross-mode verification against the COMPILED css, not the source.
 * Resolves each token to the value that actually wins the cascade in each mode,
 * then asserts the light/dark pair differs only in colour. This is the check the
 * previous pass could not run because the browser bridge was unavailable.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/assets';
const cssFile = readdirSync(dir).find((f) => f.endsWith('.css'));
const css = readFileSync(join(dir, cssFile), 'utf8');

// Last declaration inside a matching scope wins.
const resolve = (scope, token) => {
  const re = new RegExp(`${scope}\\s*\\{[^}]*?${token}\\s*:\\s*([^;}]+)`, 'g');
  let last;
  for (const m of css.matchAll(re)) last = m[1].trim();
  return last;
};

const rows = [];
const TOKENS = [
  '--sem-score-good', '--sem-score-avg', '--sem-score-bad',
  '--sem-trend-improving', '--sem-trend-declining', '--sem-trend-stable',
  '--sem-impact-beneficial', '--sem-impact-harmful', '--sem-impact-neutral',
  '--sem-bmi-under', '--sem-bmi-normal', '--sem-bmi-over', '--sem-bmi-obese',
  '--sem-macro-calories', '--sem-macro-protein', '--sem-macro-carbs',
  '--sem-macro-fats', '--sem-macro-sodium',
  '--sem-area-account', '--sem-area-health', '--sem-area-support',
  '--sem-area-premium', '--sem-streak',
  '--edge-hairline', '--ns-button-border', '--ns-card-bg', '--ns-page-bg',
  '--elev-rest', '--elev-raised', '--elev-floating', '--elev-pressed',
];

let missing = 0;
for (const t of TOKENS) {
  const light = resolve(':root', t);
  const dark = resolve('html\\.dark', t);
  if (!light || !dark) missing++;
  rows.push({ token: t, light: light ?? '(none)', dark: dark ?? '(none)' });
}

console.log(`\ncompiled: ${cssFile}\n`);
for (const r of rows) {
  const same = r.light === r.dark;
  console.log(`${r.token}`);
  console.log(`   light: ${r.light}`);
  console.log(`   dark : ${r.dark}${same ? '   [identical — inherits light]' : ''}`);
}

// Edge weight parity: an edge token may change hue between modes but not
// opacity, or the same border reads heavier in one mode than the other. This is
// how --ns-button-border sat at 0.24 alpha in light against 0.10 in dark.
const alphaOf = (v = '') => {
  const hex8 = v.match(/#[0-9a-f]{6}([0-9a-f]{2})\b/i);
  if (hex8) return parseInt(hex8[1], 16) / 255;
  const rgba = v.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/);
  return rgba ? parseFloat(rgba[1]) : null;
};

const weightDrift = [];
for (const t of ['--edge-hairline', '--ns-button-border']) {
  const l = alphaOf(resolve(':root', t));
  const d = alphaOf(resolve('html\\.dark', t));
  if (l !== null && d !== null && Math.abs(l - d) > 0.03) {
    weightDrift.push(`${t}: light alpha ${l.toFixed(2)} vs dark ${d.toFixed(2)}`);
  }
}
console.log(`\nedge-weight drift between modes: ${weightDrift.length}`);
weightDrift.forEach((w) => console.log(`   - ${w}`));

// Shape parity: every declaration inside a dark scope must be colour-only.
const SHAPE = /(border-radius|border-width|padding|margin|width|height)\s*:/g;
const drift = [];
for (const m of css.matchAll(/html\.dark[^{]*\{([^}]*)\}/g)) {
  for (const s of m[1].matchAll(SHAPE)) drift.push(s[1]);
}

console.log(`\nshape-affecting properties inside dark scopes: ${drift.length}`);
if (drift.length) console.log([...new Set(drift)].join(', '));
console.log(`tokens missing a value in one mode: ${missing}`);
process.exit(drift.length || missing || weightDrift.length ? 1 : 0);
