/**
 * Canonical score color / verdict helpers.
 * Single source of truth for all score-based colour decisions across the app.
 *
 * Score scale: 0â€“10 (higher = healthier)
 */

export const SCORE_COLORS = {
  great:   '#5BAD4E', // â‰¥ 8  â€” safe to consume
  good:    '#8BC34A', // â‰¥ 6  â€” mostly safe   â† was same as 'great' (bug fixed)
  caution: '#F59E0B', // â‰¥ 4  â€” use caution
  risk:    '#10B981', // â‰¥ 2  â€” high risk
  avoid:   '#EF4444', // < 2  â€” avoid
};

/**
 * Returns the hex colour string for a given score.
 * @param {number} score  0â€“10
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
 * Returns rgba background / border strings that pair with scoreColor.
 * @param {number} score  0â€“10
 * @returns {{ bg: string, border: string }}
 */
export function scoreBg(score) {
  if (score >= 6) return { bg: 'rgba(91,173,78,0.08)',   border: 'rgba(91,173,78,0.25)' };
  if (score >= 4) return { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)' };
  if (score >= 2) return { bg: 'rgba(245, 158, 11,0.08)',  border: 'rgba(245, 158, 11,0.3)' };
  return             { bg: 'rgba(186,26,26,0.06)',   border: 'rgba(186,26,26,0.25)' };
}

/**
 * Full verdict object used by Results.jsx.
 * @param {number} score
 * @param {Function} t  i18next translate function
 * @param {{ CheckCircle, AlertTriangle, XCircle }} icons  lucide icon components
 * @returns verdict object
 */
export function scoreVerdict(score, t, { CheckCircle, AlertTriangle, XCircle }) {
  const color  = scoreColor(score);
  const bg_obj = scoreBg(score);

  if (score >= 8) return { status: t('safe_to_consume'),  sub: t('safe_to_consume_sub'), icon: CheckCircle,  color, ...bg_obj };
  if (score >= 6) return { status: t('mostly_safe'),      sub: t('mostly_safe_sub'),     icon: CheckCircle,  color, ...bg_obj };
  if (score >= 4) return { status: t('use_caution'),      sub: t('use_caution_sub'),     icon: AlertTriangle,color, ...bg_obj };
  if (score >= 2) return { status: t('high_risk'),        sub: t('high_risk_sub'),       icon: AlertTriangle,color, ...bg_obj };
  return           { status: t('avoid'),             sub: t('avoid_sub'),           icon: XCircle,      color, ...bg_obj };
}
