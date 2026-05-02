export const BILL_TYPES = [
  'Su',
  'Elektrik',
  'Doğalgaz',
  'İnternet',
  'Kira',
  'Turkcell',
  'Vodafone',
  'Türk Telekom',
  'Diğer',
] as const;

export type BillType = (typeof BILL_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  'Yemek',
  'Temizlik',
  'Giyim',
  'Eşya',
  'Sağlık',
  'Ulaşım',
  'Diğer',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_SOURCES = ['MAAŞ', 'EK GELİR', 'DİĞER'] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];

export const BILL_STATUSES = ['Ödendi', 'Bekliyor', 'Gecikti'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Yemek: '#f97316',
  Temizlik: '#06b6d4',
  Giyim: '#a855f7',
  Eşya: '#84cc16',
  Sağlık: '#ef4444',
  Ulaşım: '#3b82f6',
  Diğer: '#6b7280',
};

export const STATUS_COLORS: Record<BillStatus, string> = {
  Ödendi: '#10b981',
  Bekliyor: '#f59e0b',
  Gecikti: '#ef4444',
};

export const DEFAULT_SETTINGS = {
  savings_target_pct: '0.20',
  currency: 'TRY',
  theme: 'light',
} as const;
