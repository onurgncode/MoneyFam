import type {
  Allowance,
  Bill,
  DebtPayment,
  Expense,
  Income,
  MonthSummary,
} from '@shared/types';
import { isInMonth } from './_helpers';

/**
 * Compute aggregate month summary purely from collections.
 * Mirrors src/main/db/repositories/reports.ts and is the source-of-truth
 * for unit tests.
 *
 * Total expense formula (no double counting):
 *   houseBills + cashAllowances + personalBills + debtPayments + expensesAmt
 */
export function computeMonthSummary(args: {
  year: number;
  month: number;
  income: Income[];
  bills: Bill[];
  allowances: Allowance[];
  debtPayments: DebtPayment[];
  expenses: Expense[];
  savingsTargetPct: number;
}): MonthSummary {
  const { year, month, income, bills, allowances, debtPayments, expenses, savingsTargetPct } =
    args;

  const incomeTotal = income
    .filter((i) => isInMonth(i.date, year, month))
    .reduce((s, i) => s + i.amount, 0);

  const householdBills = bills
    .filter(
      (b) =>
        b.status === 'Ödendi' &&
        b.paid_for_person_id == null &&
        b.paid_date != null &&
        isInMonth(b.paid_date, year, month),
    )
    .reduce((s, b) => s + b.amount, 0);

  const personalBills = bills
    .filter(
      (b) =>
        b.status === 'Ödendi' &&
        b.paid_for_person_id != null &&
        b.paid_date != null &&
        isInMonth(b.paid_date, year, month),
    )
    .reduce((s, b) => s + b.amount, 0);

  const cashAllowances = allowances
    .filter((a) => isInMonth(a.date, year, month))
    .reduce((s, a) => s + a.amount, 0);

  const debtPaymentsTotal = debtPayments
    .filter((d) => isInMonth(d.payment_date, year, month))
    .reduce((s, d) => s + d.amount, 0);

  const expensesTotal = expenses
    .filter((e) => isInMonth(e.date, year, month))
    .reduce((s, e) => s + e.amount, 0);

  const expense =
    householdBills + cashAllowances + personalBills + debtPaymentsTotal + expensesTotal;

  const remaining = incomeTotal - expense;
  const savingsTarget = incomeTotal * savingsTargetPct;
  const spendable = remaining - savingsTarget;

  return {
    year,
    month,
    income: incomeTotal,
    expense,
    remaining,
    savingsTarget,
    spendable,
    householdBills,
    cashAllowances,
    personalBills,
    debtPayments: debtPaymentsTotal,
    expenses: expensesTotal,
  };
}

export function percentChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
