/** Returns true if iso (YYYY-MM-DD) falls within the given calendar year/month. */
export function isInMonth(iso: string, year: number, month: number): boolean {
  if (!iso || iso.length < 7) return false;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return y === year && m === month;
}

export function prevYearMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}
