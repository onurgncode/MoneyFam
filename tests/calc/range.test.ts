import { describe, expect, it } from 'vitest';

/**
 * Mirrors the rangeBounds + monthsInRange logic from
 * src/main/db/repositories/reports.ts so we can test it in isolation
 * without needing better-sqlite3 native module.
 */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function monthRange(year: number, month: number): [string, string] {
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return [start, end];
}

interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

function rangeBounds(range: DateRange): [string, string] {
  const [s] = monthRange(range.startYear, range.startMonth);
  const [, e] = monthRange(range.endYear, range.endMonth);
  return [s, e];
}

function monthsInRange(range: DateRange): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  let y = range.startYear;
  let m = range.startMonth;
  while (y < range.endYear || (y === range.endYear && m <= range.endMonth)) {
    out.push({ year: y, month: m });
    if (m === 12) {
      m = 1;
      y += 1;
    } else {
      m += 1;
    }
  }
  return out;
}

describe('rangeBounds', () => {
  it('returns correct ISO bounds for single month', () => {
    expect(rangeBounds({ startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 5 })).toEqual([
      '2026-05-01',
      '2026-05-31',
    ]);
  });

  it('returns correct bounds spanning multiple months', () => {
    expect(rangeBounds({ startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 6 })).toEqual([
      '2026-01-01',
      '2026-06-30',
    ]);
  });

  it('handles year boundary', () => {
    expect(rangeBounds({ startYear: 2025, startMonth: 11, endYear: 2026, endMonth: 2 })).toEqual([
      '2025-11-01',
      '2026-02-28',
    ]);
  });

  it('uses correct last-day for February in leap year', () => {
    const [, end] = rangeBounds({ startYear: 2024, startMonth: 2, endYear: 2024, endMonth: 2 });
    expect(end).toBe('2024-02-29');
  });

  it('uses correct last-day for February in non-leap year', () => {
    const [, end] = rangeBounds({ startYear: 2026, startMonth: 2, endYear: 2026, endMonth: 2 });
    expect(end).toBe('2026-02-28');
  });
});

describe('monthsInRange', () => {
  it('returns single month for collapsed range', () => {
    const out = monthsInRange({ startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 5 });
    expect(out).toEqual([{ year: 2026, month: 5 }]);
  });

  it('returns 6 months for last 6 months range', () => {
    const out = monthsInRange({ startYear: 2025, startMonth: 12, endYear: 2026, endMonth: 5 });
    expect(out).toHaveLength(6);
    expect(out[0]).toEqual({ year: 2025, month: 12 });
    expect(out[5]).toEqual({ year: 2026, month: 5 });
  });

  it('returns 12 months for one full year', () => {
    const out = monthsInRange({ startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12 });
    expect(out).toHaveLength(12);
  });

  it('handles year boundary correctly', () => {
    const out = monthsInRange({ startYear: 2025, startMonth: 11, endYear: 2026, endMonth: 2 });
    expect(out.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2025-11',
      '2025-12',
      '2026-1',
      '2026-2',
    ]);
  });

  it('returns chronological order', () => {
    const out = monthsInRange({ startYear: 2025, startMonth: 6, endYear: 2026, endMonth: 5 });
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1].year * 12 + out[i - 1].month;
      const curr = out[i].year * 12 + out[i].month;
      expect(curr).toBe(prev + 1);
    }
  });
});

describe('CSV escaping (defensive)', () => {
  // Mirror buildCsv's escape logic (kept simple to avoid double-escaping bugs)
  function escapeCsv(value: unknown): string {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  it('returns empty for null/undefined', () => {
    expect(escapeCsv(null)).toBe('');
    expect(escapeCsv(undefined)).toBe('');
  });

  it('passes through plain strings unchanged', () => {
    expect(escapeCsv('Pazar')).toBe('Pazar');
  });

  it('quotes strings with commas', () => {
    expect(escapeCsv('Pazar, et')).toBe('"Pazar, et"');
  });

  it('escapes embedded double quotes', () => {
    expect(escapeCsv('o "kişi"')).toBe('"o ""kişi"""');
  });

  it('quotes strings with newlines', () => {
    expect(escapeCsv('a\nb')).toBe('"a\nb"');
  });
});
