import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export function formatDateTR(iso: string): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: tr });
  } catch {
    return iso;
  }
}

export function formatMonthLabel(year: number, month: number): string {
  return `${TR_MONTHS[month - 1]} ${year}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Generate a list of [year, month] going back N months from current. */
export function recentMonths(count: number): Array<{ year: number; month: number }> {
  const arr: Array<{ year: number; month: number }> = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return arr;
}
