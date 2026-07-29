/**
 * Canonical score color / verdict helpers.
 * Single source of truth for all score-based colour decisions across the app.
 *
 * Score scale: 0-10 (higher = healthier)
 *
 * These hex values are the JS mirror of the `--sem-score-*` custom properties in
 * tailwind.css. Both must stay in step: CSS is used where a stylesheet owns the
 * colour, this module where a value has to be computed in JS (SVG strokes,
 * Recharts props, inline styles). Neither is allowed to invent a band colour.
 */

export const SCORE_COLORS = {
  great:   '#059669', // >= 8  - safe to consume
  good:    '#10B981', // >= 6  - mostly safe
  caution: '#B45309', // >= 4  - use caution
  risk:    '#EA580C', // >= 2  - high risk
  avoid:   '#DC2626', // <  2  - avoid
};

/**
 * Returns the hex colour string for a given score.
 * @param {number} score  0-10
 * @returns {string} hex colour
 */
export function scoreColor(score) {
  if (score >= 8) return SCORE_COLORS.great;
  if (score >= 6) return SCORE_COLORS.good;
  if (score >= 4) return SCORE_COLORS.caution;
  if (score >= 2) return SCORE_COLORS.risk;
  return SCORE_COLORS.avoid;
}

/**
 * Returns background / border strings that pair with scoreColor.
 * Derived from the band colour by opacity mix rather than hand-picked rgba, so a
 * band's fill can never drift away from its own text colour.
 * @param {number} score  0-10
 * @returns {{ bg: string, border: string }}
 */
export function scoreBg(score) {
  const color = scoreColor(score);
  return {
    bg: `color-mix(in srgb, ${color} 8%, transparent)`,
    border: `color-mix(in srgb, ${color} 25%, transparent)`,
  };
}

/**
 * Full verdict object used by Results.jsx.
 * @param {number} score
 * @param {Function} t  i18next translate function
 * @param {{ CheckCircle, AlertTriangle, XCircle }} icons  lucide icon components
 * @returns verdict object
 */
export function scoreVerdict(score, t, { CheckCircle, AlertTriangle, XCircle }) {
  const color = scoreColor(score);
  const bg_obj = scoreBg(score);

  if (score >= 8) return { status: t('safe_to_consume'), sub: t('safe_to_consume_sub'), icon: CheckCircle,   color, ...bg_obj };
  if (score >= 6) return { status: t('mostly_safe'),     sub: t('mostly_safe_sub'),     icon: CheckCircle,   color, ...bg_obj };
  if (score >= 4) return { status: t('use_caution'),     sub: t('use_caution_sub'),     icon: AlertTriangle, color, ...bg_obj };
  if (score >= 2) return { status: t('high_risk'),       sub: t('high_risk_sub'),       icon: AlertTriangle, color, ...bg_obj };
  return            { status: t('avoid'),            sub: t('avoid_sub'),           icon: XCircle,       color, ...bg_obj };
}
