import type { BillStatus, BillType, ExpenseCategory, IncomeSource } from './constants';

export interface Person {
  id: number;
  name: string;
  is_active: number;
}

export interface Income {
  id: number;
  person_id: number;
  source: IncomeSource | string;
  amount: number;
  date: string;
  note: string | null;
}

export interface Bill {
  id: number;
  status: BillStatus;
  name: string;
  bill_type: BillType | string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  paid_for_person_id: number | null;
  account_no: string | null;
  note: string | null;
  recurring: number; // 1 = template, 0 = normal/child
  recurring_parent_id: number | null; // child → parent template
}

export interface Allowance {
  id: number;
  person_id: number;
  amount: number;
  date: string;
  note: string | null;
}

export interface Debt {
  id: number;
  name: string;
  total_amount: number;
  remaining_amount: number;
  due_date: string | null;
  note: string | null;
  is_active: number; // 1 = aktif, 0 = arşiv (kapandı)
}

export interface DebtSummary {
  total: number;
  paid: number;
  remaining: number;
  activeCount: number;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: number;
  payment_date: string;
}

export interface Expense {
  id: number;
  item_name: string;
  quantity: string | null;
  amount: number;
  category: ExpenseCategory | string;
  date: string;
  note: string | null;
}

export interface SettingRow {
  key: string;
  value: string;
}

/* ---- Input types (for create/update) ---- */

export type IncomeInput = Omit<Income, 'id'>;
export type BillInput = Omit<Bill, 'id'>;
export type AllowanceInput = Omit<Allowance, 'id'>;
export type DebtInput = Omit<Debt, 'id' | 'is_active'>;
export type DebtPaymentInput = Omit<DebtPayment, 'id'>;
export type ExpenseInput = Omit<Expense, 'id'>;
export type PersonInput = Omit<Person, 'id'>;

export interface DebtFilter {
  is_active?: number; // 1=aktif, 0=arşiv
}

/* ---- Aggregations ---- */

export interface MonthFilter {
  year: number;
  month: number; // 1-12
}

export interface MonthSummary {
  year: number;
  month: number;
  income: number;
  expense: number;
  remaining: number;
  savingsTarget: number;
  spendable: number;
  /* breakdown */
  householdBills: number;
  cashAllowances: number;
  personalBills: number;
  debtPayments: number;
  expenses: number;
}

export interface PersonAllowanceSummary {
  person_id: number;
  person_name: string;
  cash: number;
  bills: number;
  total: number;
}

export interface BillTypeSummary {
  bill_type: string;
  total: number;
}

export interface ExpenseCategorySummary {
  category: string;
  total: number;
}

export interface MonthTrendPoint {
  year: number;
  month: number;
  income: number;
  expense: number;
}

export interface UpcomingPayment {
  kind: 'bill' | 'debt';
  id: number;
  name: string;
  amount: number;
  due_date: string;
  status: 'overdue' | 'soon' | 'upcoming';
}

export interface DashboardData {
  summary: MonthSummary;
  prevSummary: MonthSummary;
  personAllowances: PersonAllowanceSummary[];
  billTypeBreakdown: BillTypeSummary[];
  expenseCategoryBreakdown: ExpenseCategorySummary[];
  trend6m: MonthTrendPoint[];
  upcoming: UpcomingPayment[];
}

/* ---- Reports (date-range aggregations) ---- */

export interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export interface RangeMonthRow {
  year: number;
  month: number;
  income: number;
  expense: number;
  remaining: number;
}

export interface RangePersonAllowanceRow {
  person_id: number;
  person_name: string;
  cash: number;
  bills: number;
  total: number;
}

export interface ReportData {
  range: DateRange;
  totals: {
    income: number;
    expense: number;
    remaining: number;
    monthsCount: number;
    avgIncome: number;
    avgExpense: number;
  };
  monthly: RangeMonthRow[];
  billTypeBreakdown: BillTypeSummary[];
  expenseCategoryBreakdown: ExpenseCategorySummary[];
  personAllowances: RangePersonAllowanceRow[];
}

export type CsvKind =
  | 'income'
  | 'bills'
  | 'allowances'
  | 'expenses'
  | 'debts'
  | 'debt_payments'
  | 'all';

/* ---- Filters ---- */

export interface BillFilter {
  year?: number;
  month?: number;
  status?: BillStatus;
  bill_type?: string;
  paid_for_person_id?: number | null;
}

export interface IncomeFilter {
  year?: number;
  month?: number;
  person_id?: number;
}

export interface ExpenseFilter {
  year?: number;
  month?: number;
  category?: string;
}

export interface AllowanceFilter {
  year?: number;
  month?: number;
  person_id?: number;
}

/* ---- IPC envelope ---- */

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };
