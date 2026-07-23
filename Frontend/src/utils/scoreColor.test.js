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
  test('score >= 6 returns green bg', () => {
    expect(scoreBg(7).bg).toContain('91,173,78');
  });
  test('score 5 returns caution bg', () => {
    expect(scoreBg(5).bg).toContain('245,158,11');
  });
  test('score 3 returns risk bg', () => {
    expect(scoreBg(3).bg).toContain('245, 158, 11');
  });
  test('score 1 returns avoid bg', () => {
    expect(scoreBg(1).bg).toContain('186,26,26');
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
