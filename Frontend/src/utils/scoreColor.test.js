import { scoreColor, scoreBg, scoreVerdict, SCORE_COLORS } from './scoreColor';

describe('scoreColor', () => {
  test.each([
    [9, SCORE_COLORS.great],
    [7, SCORE_COLORS.good],
    [5, SCORE_COLORS.caution],
    [3, SCORE_COLORS.risk],
    [1, SCORE_COLORS.avoid],
  ])('score %i â†’ %s', (score, expected) => {
    expect(scoreColor(score)).toBe(expected);
  });
});

describe('scoreBg', () => {
  // The invariant that matters is that a band's fill is derived from that same
  // band's text colour, so the two can never drift apart. Asserting literal
  // rgba strings previously let the fill and the text colour disagree (score 3
  // returned an amber fill next to an emerald text colour) while still passing.
  test.each([9, 7, 5, 3, 1])('score %i fill and border derive from its own band colour', (score) => {
    const { bg, border } = scoreBg(score);
    expect(bg).toContain(scoreColor(score));
    expect(border).toContain(scoreColor(score));
  });

  test('fill is more transparent than its border', () => {
    expect(scoreBg(9).bg).toContain('8%');
    expect(scoreBg(9).border).toContain('25%');
  });

  test('each band is visually distinct from the others', () => {
    const colors = [9, 7, 5, 3, 1].map(scoreColor);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('scoreVerdict', () => {
  const t = (k) => k;
  const icons = { CheckCircle: 'Check', AlertTriangle: 'Alert', XCircle: 'X' };

  test.each([
    [9, 'safe_to_consume', 'Check'],
    [7, 'mostly_safe', 'Check'],
    [5, 'use_caution', 'Alert'],
    [3, 'high_risk', 'Alert'],
    [1, 'avoid', 'X'],
  ])('score %i â†’ status %s, icon %s', (score, status, icon) => {
    const v = scoreVerdict(score, t, icons);
    expect(v.status).toBe(status);
    expect(v.icon).toBe(icon);
    expect(v.color).toBe(scoreColor(score));
  });
});
