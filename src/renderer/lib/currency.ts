const formatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatTRY(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return formatter.format(amount);
}

export function formatTRYCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return compactFormatter.format(amount);
}

/** Parses "1.234,56" or "1234.56" into 1234.56. Returns NaN on failure. */
export function parseTRY(input: string): number {
  if (!input) return NaN;
  const trimmed = input.trim().replace(/\s/g, '').replace(/₺/g, '');
  // If has comma, treat dot as thousand separator. Else trust dot.
  if (trimmed.includes(',')) {
    return Number(trimmed.replace(/\./g, '').replace(',', '.'));
  }
  return Number(trimmed);
}
