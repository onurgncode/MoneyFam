import { describe, expect, it } from 'vitest';
import { msUntilNext09, msUntilNextSunday03 } from '@main/scheduling-helpers';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('msUntilNextSunday03', () => {
  it('returns ~6 days from Monday morning', () => {
    // Monday May 4 2026 at 02:00 → next Sunday May 10 2026 at 03:00 = 6d 1h
    const monday = new Date(2026, 4, 4, 2, 0, 0); // month is 0-indexed
    const ms = msUntilNextSunday03(monday);
    expect(ms).toBe(6 * DAY + 1 * HOUR);
  });

  it('returns ~1 hour from Sunday at 02:00 (same day)', () => {
    const sun = new Date(2026, 4, 10, 2, 0, 0);
    const ms = msUntilNextSunday03(sun);
    expect(ms).toBe(1 * HOUR);
  });

  it('skips to next Sunday when already past 03:00 on Sunday', () => {
    const sun = new Date(2026, 4, 10, 4, 0, 0);
    const ms = msUntilNextSunday03(sun);
    // 7d - 1h = 6d 23h
    expect(ms).toBe(7 * DAY - 1 * HOUR);
  });

  it('returns ~3 hours from Saturday 24:00 (= Sunday 00:00)', () => {
    const sat = new Date(2026, 4, 10, 0, 0, 0);
    const ms = msUntilNextSunday03(sat);
    expect(ms).toBe(3 * HOUR);
  });

  it('returns positive values across all weekdays', () => {
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(2026, 4, 4 + dow, 12, 0, 0);
      expect(msUntilNextSunday03(d)).toBeGreaterThan(0);
      expect(msUntilNextSunday03(d)).toBeLessThanOrEqual(7 * DAY);
    }
  });
});

describe('msUntilNext09', () => {
  it('returns ~1 hour from 08:00 same day', () => {
    expect(msUntilNext09(new Date(2026, 4, 4, 8, 0, 0))).toBe(1 * HOUR);
  });

  it('returns ~24 hours when already past 09:00', () => {
    expect(msUntilNext09(new Date(2026, 4, 4, 10, 0, 0))).toBe(23 * HOUR);
  });

  it('rolls over to next day when at exactly 09:00', () => {
    expect(msUntilNext09(new Date(2026, 4, 4, 9, 0, 0))).toBe(24 * HOUR);
  });

  it('returns ~9 hours from midnight', () => {
    expect(msUntilNext09(new Date(2026, 4, 4, 0, 0, 0))).toBe(9 * HOUR);
  });
});
