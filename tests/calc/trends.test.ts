import { describe, expect, it } from 'vitest';
import { buildTrend } from '@renderer/lib/calc/trends';

describe('buildTrend', () => {
  it('returns 6 consecutive months ending at given month', () => {
    const r = buildTrend(6, 2026, 5, new Map());
    expect(r).toHaveLength(6);
    expect(r.map((p) => `${p.year}-${p.month}`)).toEqual([
      '2025-12',
      '2026-1',
      '2026-2',
      '2026-3',
      '2026-4',
      '2026-5',
    ]);
  });

  it('handles year boundary correctly', () => {
    const r = buildTrend(3, 2026, 2, new Map());
    expect(r.map((p) => `${p.year}-${p.month}`)).toEqual(['2025-12', '2026-1', '2026-2']);
  });

  it('fills missing months with zeros', () => {
    const map = new Map<string, { income: number; expense: number }>([
      ['2026-05', { income: 5000, expense: 3000 }],
    ]);
    const r = buildTrend(3, 2026, 5, map);
    expect(r[0]).toMatchObject({ year: 2026, month: 3, income: 0, expense: 0 });
    expect(r[1]).toMatchObject({ year: 2026, month: 4, income: 0, expense: 0 });
    expect(r[2]).toMatchObject({ year: 2026, month: 5, income: 5000, expense: 3000 });
  });

  it('does not include future months', () => {
    const r = buildTrend(6, 2026, 5, new Map());
    for (const p of r) {
      const total = p.year * 100 + p.month;
      expect(total).toBeLessThanOrEqual(2026 * 100 + 5);
    }
  });
});
