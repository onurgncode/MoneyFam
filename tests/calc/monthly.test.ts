import { describe, expect, it } from 'vitest';
import { computeMonthSummary, percentChange } from '@renderer/lib/calc/monthly';
import type { Allowance, Bill, DebtPayment, Expense, Income } from '@shared/types';

const incomeRow = (over: Partial<Income>): Income => ({
  id: 1,
  person_id: 1,
  source: 'MAAŞ',
  amount: 10000,
  date: '2026-05-05',
  note: null,
  ...over,
});

const billRow = (over: Partial<Bill>): Bill => ({
  id: 1,
  status: 'Ödendi',
  name: 'Elektrik',
  bill_type: 'Elektrik',
  amount: 1000,
  due_date: '2026-05-10',
  paid_date: '2026-05-09',
  paid_for_person_id: null,
  account_no: null,
  note: null,
  recurring: 0,
  recurring_parent_id: null,
  ...over,
});

const allowanceRow = (over: Partial<Allowance>): Allowance => ({
  id: 1,
  person_id: 1,
  amount: 500,
  date: '2026-05-15',
  note: null,
  ...over,
});

const debtPaymentRow = (over: Partial<DebtPayment>): DebtPayment => ({
  id: 1,
  debt_id: 1,
  amount: 200,
  payment_date: '2026-05-01',
  ...over,
});

const expenseRow = (over: Partial<Expense>): Expense => ({
  id: 1,
  item_name: 'Pazar',
  quantity: null,
  amount: 300,
  category: 'Yemek',
  date: '2026-05-12',
  note: null,
  ...over,
});

describe('computeMonthSummary', () => {
  it('returns all zeros for an empty month', () => {
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [],
      bills: [],
      allowances: [],
      debtPayments: [],
      expenses: [],
      savingsTargetPct: 0.2,
    });
    expect(r.income).toBe(0);
    expect(r.expense).toBe(0);
    expect(r.remaining).toBe(0);
    expect(r.savingsTarget).toBe(0);
    expect(r.spendable).toBe(0);
  });

  it('counts personal bills exactly once (no double counting)', () => {
    // Spec critical: Onur'un 2000₺ telefon faturası → toplam giderde 1 kez sayılmalı.
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [incomeRow({ amount: 50000 })],
      bills: [
        billRow({ paid_for_person_id: null, amount: 1500 }), // ev faturası
        billRow({ paid_for_person_id: 1, amount: 2000 }), // kişisel
      ],
      allowances: [allowanceRow({ amount: 1000 })],
      debtPayments: [debtPaymentRow({ amount: 500 })],
      expenses: [expenseRow({ amount: 800 })],
      savingsTargetPct: 0.2,
    });
    // expense = 1500 (ev) + 2000 (kişisel) + 1000 (nakit) + 500 (borç) + 800 (harcama) = 5800
    expect(r.householdBills).toBe(1500);
    expect(r.personalBills).toBe(2000);
    expect(r.cashAllowances).toBe(1000);
    expect(r.debtPayments).toBe(500);
    expect(r.expenses).toBe(800);
    expect(r.expense).toBe(5800);
    expect(r.income).toBe(50000);
    expect(r.remaining).toBe(50000 - 5800);
    expect(r.savingsTarget).toBeCloseTo(10000, 5);
    expect(r.spendable).toBeCloseTo(50000 - 5800 - 10000, 5);
  });

  it('only counts paid bills (Ödendi)', () => {
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [],
      bills: [
        billRow({ status: 'Bekliyor', amount: 1000 }),
        billRow({ status: 'Gecikti', amount: 500 }),
        billRow({ status: 'Ödendi', amount: 800 }),
      ],
      allowances: [],
      debtPayments: [],
      expenses: [],
      savingsTargetPct: 0.2,
    });
    expect(r.householdBills).toBe(800);
    expect(r.expense).toBe(800);
  });

  it('uses paid_date (not due_date) for bill month attribution', () => {
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [],
      bills: [
        // due_date in May ama paid_date Haziran → mayısta sayılmaz
        billRow({ amount: 1000, due_date: '2026-05-30', paid_date: '2026-06-02' }),
      ],
      allowances: [],
      debtPayments: [],
      expenses: [],
      savingsTargetPct: 0.2,
    });
    expect(r.householdBills).toBe(0);
  });

  it('skips bills with null paid_date even if Ödendi (defensive)', () => {
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [],
      bills: [billRow({ status: 'Ödendi', paid_date: null, amount: 9999 })],
      allowances: [],
      debtPayments: [],
      expenses: [],
      savingsTargetPct: 0.2,
    });
    expect(r.expense).toBe(0);
  });

  it('respects month boundaries for all collections', () => {
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [
        incomeRow({ amount: 1000, date: '2026-04-30' }),
        incomeRow({ amount: 2000, date: '2026-05-01' }),
        incomeRow({ amount: 3000, date: '2026-05-31' }),
        incomeRow({ amount: 4000, date: '2026-06-01' }),
      ],
      bills: [],
      allowances: [
        allowanceRow({ amount: 100, date: '2026-04-30' }),
        allowanceRow({ amount: 200, date: '2026-05-15' }),
      ],
      debtPayments: [
        debtPaymentRow({ amount: 50, payment_date: '2026-05-31' }),
        debtPaymentRow({ amount: 70, payment_date: '2026-06-01' }),
      ],
      expenses: [
        expenseRow({ amount: 30, date: '2026-05-01' }),
        expenseRow({ amount: 40, date: '2026-04-30' }),
      ],
      savingsTargetPct: 0.2,
    });
    expect(r.income).toBe(5000);
    expect(r.cashAllowances).toBe(200);
    expect(r.debtPayments).toBe(50);
    expect(r.expenses).toBe(30);
  });

  it('computes savings target and spendable from configurable pct', () => {
    const r = computeMonthSummary({
      year: 2026,
      month: 5,
      income: [incomeRow({ amount: 10000 })],
      bills: [],
      allowances: [],
      debtPayments: [],
      expenses: [expenseRow({ amount: 2000 })],
      savingsTargetPct: 0.3,
    });
    expect(r.savingsTarget).toBeCloseTo(3000, 5);
    expect(r.spendable).toBeCloseTo(10000 - 2000 - 3000, 5);
  });
});

describe('percentChange', () => {
  it('returns null when previous is zero', () => {
    expect(percentChange(100, 0)).toBeNull();
  });
  it('returns positive % for increase', () => {
    expect(percentChange(150, 100)).toBeCloseTo(50, 5);
  });
  it('returns negative % for decrease', () => {
    expect(percentChange(50, 100)).toBeCloseTo(-50, 5);
  });
  it('handles negative previous values', () => {
    expect(percentChange(-50, -100)).toBeCloseTo(50, 5);
  });
});
