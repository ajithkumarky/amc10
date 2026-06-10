import { describe, expect, it } from 'vitest';
import { computeStreak } from '@/components/progress/progress-dashboard';

/** Format a UTC date offset by `daysAgo` days from today as YYYY-MM-DD */
function utcDate(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function day(daysAgo: number): { date: string; count: number } {
  return { date: utcDate(daysAgo), count: 1 };
}

describe('computeStreak', () => {
  it('returns 0 for an empty array', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 2 when today and yesterday are present', () => {
    expect(computeStreak([day(0), day(1)])).toBe(2);
  });

  it('breaks at a gap: today present, yesterday missing, day-before present → 1', () => {
    expect(computeStreak([day(0), day(2)])).toBe(1);
  });

  it('returns 0 when today is missing', () => {
    expect(computeStreak([day(1), day(2)])).toBe(0);
  });
});
