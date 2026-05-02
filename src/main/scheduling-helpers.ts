/**
 * Pure date / scheduling helpers — no Electron or native deps so they're
 * testable directly under Vitest. Also reused by repositories that need
 * deterministic date math (recurring bills, month walks).
 */

const HOUR = 60 * 60 * 1000;

export function parseDayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function ymFromIso(iso: string): { year: number; month: number } {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

export function ymOf(d: Date): { year: number; month: number } {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function nextMonth(ym: { year: number; month: number }): { year: number; month: number } {
  return ym.month === 12 ? { year: ym.year + 1, month: 1 } : { year: ym.year, month: ym.month + 1 };
}

export function clampDayOfMonth(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

/** ms until the next Sunday at 03:00 local time. */
export function msUntilNextSunday03(now: Date = new Date()): number {
  const target = new Date(now);
  target.setHours(3, 0, 0, 0);
  const todayDow = target.getDay(); // 0 = Sunday
  let daysAhead = (7 - todayDow) % 7;
  if (daysAhead === 0 && target.getTime() <= now.getTime()) daysAhead = 7;
  target.setDate(target.getDate() + daysAhead);
  return target.getTime() - now.getTime();
}

/** ms until the next 09:00 local time. */
export function msUntilNext09(now: Date = new Date()): number {
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export { HOUR };
