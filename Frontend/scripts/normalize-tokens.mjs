/**
 * Phase 3 token migration for src/tailwind.css.
 *
 * Applies only the mappings written in DESIGN_TOKENS.md sections 1 (radius) and
 * 2 (border widths). Scoped by CSS class prefix so it can be run one builder
 * lane at a time, per the one-lane-per-pass rule.
 *
 * Usage: node scripts/normalize-tokens.mjs <lane> [--write]
 *   lane = a | b | c | d | e | all
 *
 * Without --write it only reports, so the diff can be reviewed first.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/tailwind.css';

// DESIGN_TOKENS.md section 1: every off-scale radius maps to one scale step.
const RADIUS_MAP = {
  '2px': '8px', '4px': '8px', '6px': '8px', '9px': '8px',
  '10px': '12px', '11px': '12px', '13px': '12px', '14px': '12px', '15px': '12px',
  '18px': '16px',
  '22px': '20px', '24px': '20px', '26px': '20px',
  '30px': '28px', '40px': '28px',
  '99px': '999px', '9999px': '999px',
};

// Radii that are shape rather than scale, so they are exempt.
const SHAPE_EXEMPT = /^(inherit|50%|999px|8px|12px|16px|20px|28px|var\(|[\d.]+px\s+[\d.]+px|0\s)/;

// Lane -> owned class prefixes (UI_POLISH_INVENTORY.md section 4).
const LANES = {
  a: ['dashboard-', 'fitscan-dashboard', 'fitscan-bmi-'],
  b: ['scan-', 'barcode-', 'result-', 'servings-'],
  c: ['profile-', 'personal-detail', 'medical-', 'health-goals-', 'delete-confirm-',
      'deletion-banner-', 'delete-scheduled-', 'delete-success-', 'language-selector',
      'theme-toggle-btn'],
  d: ['bottom-nav', 'history-', 'food-db-', 'compare-', 'trends-', 'stat-card-',
      'range-tabs', 'graph-', 'sheet-', 'streak-', 'leaderboard-', 'fr-', 'vote-btn',
      'badge-', 'category-chips', 'submit-btn', 'search-pill'],
  e: ['nf-ob-', 'plan-', 'ns-card', 'ns-modal', 'glass-card', 'btn-', 'nutrient-chip'],
  // Shared/base layer: legacy fitscan-* screens plus the global form and
  // progress primitives that no single screen lane owns.
  base: ['fitscan-', 'ns-progress', 'header-status-bar', 'custom-range-inputs',
         'form-group', 'deletion-scheduled-banner'],
};

const lane = (process.argv[2] || 'all').toLowerCase();
const write = process.argv.includes('--write');
const prefixes = lane === 'all' ? Object.values(LANES).flat() : LANES[lane];
if (!prefixes) {
  console.error(`Unknown lane "${lane}". Use one of: a b c d e all`);
  process.exit(1);
}

const src = readFileSync(FILE, 'utf8');
const lines = src.split('\n');

// Track the selector block we are inside, so edits stay within the lane.
let currentSelector = '';
let inLaneBlock = false;
let depth = 0;
const changes = [];

const out = lines.map((line, idx) => {
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;

  // A selector line is one that ends in `{` and is not an at-rule.
  if (opens > 0 && !line.trim().startsWith('@')) {
    const sel = line.slice(0, line.indexOf('{'));
    if (sel.trim()) {
      currentSelector = sel.trim();
      inLaneBlock = prefixes.some((p) => currentSelector.includes('.' + p));
    }
  }

  let next = line;

  if (inLaneBlock && depth >= 0) {
    // Radius: map off-scale values onto the scale.
    next = next.replace(/(border-radius:\s*)([^;!}\n]+)/g, (m, prop, value) => {
      const v = value.trim();
      if (SHAPE_EXEMPT.test(v)) return m;
      const mapped = RADIUS_MAP[v];
      if (!mapped) return m;
      changes.push(`${currentSelector} :: radius ${v} -> ${mapped}`);
      return prop + mapped;
    });

    // Border width: 1.5px is not one of the three treatments; hairline is 1px.
    next = next.replace(/(border(?:-top|-right|-bottom|-left)?:\s*)1\.5px/g, (m, prop) => {
      changes.push(`${currentSelector} :: border 1.5px -> 1px (hairline)`);
      return prop + '1px';
    });
  }

  depth += opens - closes;
  if (depth <= 0) {
    depth = 0;
    inLaneBlock = false;
  }
  return next;
});

console.log(`lane ${lane}: ${changes.length} changes`);
const grouped = {};
changes.forEach((c) => { grouped[c] = (grouped[c] || 0) + 1; });
Object.entries(grouped).forEach(([c, n]) => console.log(`  ${n}x  ${c}`));

if (write && changes.length) {
  writeFileSync(FILE, out.join('\n'), 'utf8');
  console.log(`\nwritten to ${FILE}`);
} else if (!write) {
  console.log('\n(dry run — pass --write to apply)');
}
