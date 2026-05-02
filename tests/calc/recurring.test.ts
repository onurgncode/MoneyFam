import { describe, expect, it } from 'vitest';
import {
  clampDayOfMonth,
  nextMonth,
  parseDayOfMonth,
  ymFromIso,
  ymOf,
} from '@main/scheduling-helpers';

describe('parseDayOfMonth', () => {
  it('extracts day from ISO date', () => {
    expect(parseDayOfMonth('2026-05-15')).toBe(15);
    expect(parseDayOfMonth('2026-12-01')).toBe(1);
    expect(parseDayOfMonth('2026-02-28')).toBe(28);
  });
});

describe('ymFromIso', () => {
  it('parses year and month', () => {
    expect(ymFromIso('2026-05-15')).toEqual({ year: 2026, month: 5 });
    expect(ymFromIso('2025-12-31')).toEqual({ year: 2025, month: 12 });
  });
});

describe('ymOf', () => {
  it('returns 1-indexed month', () => {
    expect(ymOf(new Date(2026, 0, 1))).toEqual({ year: 2026, month: 1 });
    expect(ymOf(new Date(2026, 11, 31))).toEqual({ year: 2026, month: 12 });
  });
});

describe('nextMonth', () => {
  it('increments month within same year', () => {
    expect(nextMonth({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 6 });
  });
  it('rolls over to January of next year', () => {
    expect(nextMonth({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
  });
});

describe('clampDayOfMonth', () => {
  it('keeps day when valid', () => {
    expect(clampDayOfMonth(2026, 5, 15)).toBe('2026-05-15');
  });

  it('clamps to last day of February (non-leap)', () => {
    expect(clampDayOfMonth(2026, 2, 31)).toBe('2026-02-28');
    expect(clampDayOfMonth(2026, 2, 30)).toBe('2026-02-28');
  });

  it('clamps to last day of February (leap year)', () => {
    expect(clampDayOfMonth(2024, 2, 31)).toBe('2024-02-29');
    expect(clampDayOfMonth(2024, 2, 29)).toBe('2024-02-29');
  });

  it('clamps day 31 to 30 in 30-day months', () => {
    expect(clampDayOfMonth(2026, 4, 31)).toBe('2026-04-30');
    expect(clampDayOfMonth(2026, 6, 31)).toBe('2026-06-30');
    expect(clampDayOfMonth(2026, 9, 31)).toBe('2026-09-30');
    expect(clampDayOfMonth(2026, 11, 31)).toBe('2026-11-30');
  });

  it('keeps day 31 in 31-day months', () => {
    expect(clampDayOfMonth(2026, 1, 31)).toBe('2026-01-31');
    expect(clampDayOfMonth(2026, 3, 31)).toBe('2026-03-31');
    expect(clampDayOfMonth(2026, 5, 31)).toBe('2026-05-31');
  });

  it('zero-pads month and day', () => {
    expect(clampDayOfMonth(2026, 1, 5)).toBe('2026-01-05');
    expect(clampDayOfMonth(2026, 9, 9)).toBe('2026-09-09');
  });
});

describe('recurring monthly walk integration', () => {
  it('produces correct sequence from May 2026 → Aug 2026 with day 15', () => {
    let cursor = nextMonth(ymFromIso('2026-05-15'));
    const out: string[] = [];
    while (cursor.year < 2026 || (cursor.year === 2026 && cursor.month <= 8)) {
      out.push(clampDayOfMonth(cursor.year, cursor.month, 15));
      cursor = nextMonth(cursor);
    }
    expect(out).toEqual(['2026-06-15', '2026-07-15', '2026-08-15']);
  });

  it('handles day 31 across mixed-length months', () => {
    let cursor = nextMonth(ymFromIso('2026-01-31'));
    const out: string[] = [];
    while (cursor.year < 2026 || (cursor.year === 2026 && cursor.month <= 5)) {
      out.push(clampDayOfMonth(cursor.year, cursor.month, 31));
      cursor = nextMonth(cursor);
    }
    expect(out).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });
});
