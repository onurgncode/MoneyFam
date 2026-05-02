import type { MonthTrendPoint } from '@shared/types';
import { prevYearMonth } from './_helpers';

/**
 * Returns last `count` months ending at (year, month) inclusive,
 * filling missing months with zero.
 */
export function buildTrend(
  count: number,
  year: number,
  month: number,
  pointsByKey: Map<string, { income: number; expense: number }>,
): MonthTrendPoint[] {
  const stack: { year: number; month: number }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    stack.unshift({ year: y, month: m });
    const p = prevYearMonth(y, m);
    y = p.year;
    m = p.month;
  }
  return stack.map(({ year: yy, month: mm }) => {
    const key = `${yy}-${String(mm).padStart(2, '0')}`;
    const pt = pointsByKey.get(key);
    return {
      year: yy,
      month: mm,
      income: pt?.income ?? 0,
      expense: pt?.expense ?? 0,
    };
  });
}
