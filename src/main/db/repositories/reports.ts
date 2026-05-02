import type Database from 'better-sqlite3';
import type {
  BillTypeSummary,
  DashboardData,
  DateRange,
  ExpenseCategorySummary,
  MonthFilter,
  MonthSummary,
  MonthTrendPoint,
  PersonAllowanceSummary,
  RangeMonthRow,
  RangePersonAllowanceRow,
  ReportData,
  UpcomingPayment,
} from '@shared/types';
import { addDaysIso, isoToday, monthRange } from './_helpers';

function sum(db: Database.Database, sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...params) as { total: number | null } | undefined;
  return Number(row?.total ?? 0);
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export class ReportsRepository {
  constructor(private db: Database.Database) {}

  monthSummary(year: number, month: number): MonthSummary {
    const [start, end] = monthRange(year, month);

    const income = sum(
      this.db,
      'SELECT COALESCE(SUM(amount),0) AS total FROM income WHERE date BETWEEN ? AND ?',
      start,
      end,
    );

    const householdBills = sum(
      this.db,
      `SELECT COALESCE(SUM(amount),0) AS total FROM bills
       WHERE status = 'Ödendi' AND paid_for_person_id IS NULL
         AND paid_date IS NOT NULL AND paid_date BETWEEN ? AND ?`,
      start,
      end,
    );

    const personalBills = sum(
      this.db,
      `SELECT COALESCE(SUM(amount),0) AS total FROM bills
       WHERE status = 'Ödendi' AND paid_for_person_id IS NOT NULL
         AND paid_date IS NOT NULL AND paid_date BETWEEN ? AND ?`,
      start,
      end,
    );

    const cashAllowances = sum(
      this.db,
      'SELECT COALESCE(SUM(amount),0) AS total FROM allowances WHERE date BETWEEN ? AND ?',
      start,
      end,
    );

    const debtPayments = sum(
      this.db,
      'SELECT COALESCE(SUM(amount),0) AS total FROM debt_payments WHERE payment_date BETWEEN ? AND ?',
      start,
      end,
    );

    const expensesAmt = sum(
      this.db,
      'SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date BETWEEN ? AND ?',
      start,
      end,
    );

    // Onaylanan formül: ev faturaları + tüm harçlıklar (nakit + kişisel faturalar) + borç + harcamalar
    const expense =
      householdBills + cashAllowances + personalBills + debtPayments + expensesAmt;

    const savingsPctRow = this.db
      .prepare(`SELECT value FROM settings WHERE key = 'savings_target_pct'`)
      .get() as { value: string } | undefined;
    const savingsPct = Number(savingsPctRow?.value ?? '0.20');

    const remaining = income - expense;
    const savingsTarget = income * savingsPct;
    const spendable = remaining - savingsTarget;

    return {
      year,
      month,
      income,
      expense,
      remaining,
      savingsTarget,
      spendable,
      householdBills,
      cashAllowances,
      personalBills,
      debtPayments,
      expenses: expensesAmt,
    };
  }

  personAllowances(year: number, month: number): PersonAllowanceSummary[] {
    const [start, end] = monthRange(year, month);
    const rows = this.db
      .prepare(
        `SELECT p.id AS person_id, p.name AS person_name,
                COALESCE((SELECT SUM(amount) FROM allowances a
                          WHERE a.person_id = p.id AND a.date BETWEEN ? AND ?), 0) AS cash,
                COALESCE((SELECT SUM(amount) FROM bills b
                          WHERE b.paid_for_person_id = p.id AND b.status='Ödendi'
                            AND b.paid_date BETWEEN ? AND ?), 0) AS bills
         FROM persons p WHERE p.is_active = 1 ORDER BY p.name`,
      )
      .all(start, end, start, end) as Array<{
      person_id: number;
      person_name: string;
      cash: number;
      bills: number;
    }>;
    return rows.map((r) => ({ ...r, total: r.cash + r.bills }));
  }

  billTypeBreakdown(year: number, month: number): BillTypeSummary[] {
    const [start, end] = monthRange(year, month);
    return this.db
      .prepare(
        `SELECT bill_type, COALESCE(SUM(amount),0) AS total FROM bills
         WHERE status='Ödendi' AND paid_date BETWEEN ? AND ?
         GROUP BY bill_type ORDER BY total DESC`,
      )
      .all(start, end) as BillTypeSummary[];
  }

  expenseCategoryBreakdown(year: number, month: number): ExpenseCategorySummary[] {
    const [start, end] = monthRange(year, month);
    return this.db
      .prepare(
        `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`,
      )
      .all(start, end) as ExpenseCategorySummary[];
  }

  trend6m(year: number, month: number): MonthTrendPoint[] {
    const points: MonthTrendPoint[] = [];
    let y = year;
    let m = month;
    const stack: { y: number; m: number }[] = [];
    for (let i = 0; i < 6; i++) {
      stack.unshift({ y, m });
      const p = prevMonth(y, m);
      y = p.year;
      m = p.month;
    }
    for (const { y: yy, m: mm } of stack) {
      const s = this.monthSummary(yy, mm);
      points.push({ year: yy, month: mm, income: s.income, expense: s.expense });
    }
    return points;
  }

  upcoming(): UpcomingPayment[] {
    const today = isoToday();
    const horizon = addDaysIso(today, 7);
    const soon = addDaysIso(today, 3);
    const billsRows = this.db
      .prepare(
        `SELECT id, name, amount, due_date FROM bills
         WHERE status IN ('Bekliyor','Gecikti') AND due_date <= ?
         ORDER BY due_date ASC`,
      )
      .all(horizon) as Array<{ id: number; name: string; amount: number; due_date: string }>;
    const debtsRows = this.db
      .prepare(
        `SELECT id, name, remaining_amount AS amount, due_date FROM debts
         WHERE remaining_amount > 0 AND due_date IS NOT NULL AND due_date <= ?
         ORDER BY due_date ASC`,
      )
      .all(horizon) as Array<{ id: number; name: string; amount: number; due_date: string }>;
    const status = (d: string): UpcomingPayment['status'] =>
      d < today ? 'overdue' : d <= soon ? 'soon' : 'upcoming';
    return [
      ...billsRows.map<UpcomingPayment>((b) => ({
        kind: 'bill',
        id: b.id,
        name: b.name,
        amount: b.amount,
        due_date: b.due_date,
        status: status(b.due_date),
      })),
      ...debtsRows.map<UpcomingPayment>((d) => ({
        kind: 'debt',
        id: d.id,
        name: d.name,
        amount: d.amount,
        due_date: d.due_date,
        status: status(d.due_date),
      })),
    ].sort((a, b) => a.due_date.localeCompare(b.due_date));
  }

  /** Inclusive range bounds expressed as [startISO, endISO]. */
  private rangeBounds(range: DateRange): [string, string] {
    const [startIso] = monthRange(range.startYear, range.startMonth);
    const [, endIso] = monthRange(range.endYear, range.endMonth);
    return [startIso, endIso];
  }

  /** All months in [start, end] inclusive, in chronological order. */
  private monthsInRange(range: DateRange): Array<{ year: number; month: number }> {
    const out: Array<{ year: number; month: number }> = [];
    let y = range.startYear;
    let m = range.startMonth;
    while (y < range.endYear || (y === range.endYear && m <= range.endMonth)) {
      out.push({ year: y, month: m });
      if (m === 12) {
        m = 1;
        y += 1;
      } else {
        m += 1;
      }
    }
    return out;
  }

  rangeMonthly(range: DateRange): RangeMonthRow[] {
    return this.monthsInRange(range).map(({ year, month }) => {
      const s = this.monthSummary(year, month);
      return { year, month, income: s.income, expense: s.expense, remaining: s.remaining };
    });
  }

  rangeBillTypes(range: DateRange): BillTypeSummary[] {
    const [start, end] = this.rangeBounds(range);
    return this.db
      .prepare(
        `SELECT bill_type, COALESCE(SUM(amount),0) AS total FROM bills
         WHERE status='Ödendi' AND paid_date BETWEEN ? AND ?
         GROUP BY bill_type ORDER BY total DESC`,
      )
      .all(start, end) as BillTypeSummary[];
  }

  rangeExpenseCategories(range: DateRange): ExpenseCategorySummary[] {
    const [start, end] = this.rangeBounds(range);
    return this.db
      .prepare(
        `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`,
      )
      .all(start, end) as ExpenseCategorySummary[];
  }

  rangePersonAllowances(range: DateRange): RangePersonAllowanceRow[] {
    const [start, end] = this.rangeBounds(range);
    const rows = this.db
      .prepare(
        `SELECT p.id AS person_id, p.name AS person_name,
                COALESCE((SELECT SUM(amount) FROM allowances a
                          WHERE a.person_id = p.id AND a.date BETWEEN ? AND ?), 0) AS cash,
                COALESCE((SELECT SUM(amount) FROM bills b
                          WHERE b.paid_for_person_id = p.id AND b.status='Ödendi'
                            AND b.paid_date BETWEEN ? AND ?), 0) AS bills
         FROM persons p WHERE p.is_active = 1 ORDER BY p.name`,
      )
      .all(start, end, start, end) as Array<{
      person_id: number;
      person_name: string;
      cash: number;
      bills: number;
    }>;
    return rows.map((r) => ({ ...r, total: r.cash + r.bills }));
  }

  report(range: DateRange): ReportData {
    const monthly = this.rangeMonthly(range);
    const totalIncome = monthly.reduce((s, r) => s + r.income, 0);
    const totalExpense = monthly.reduce((s, r) => s + r.expense, 0);
    const months = monthly.length || 1;
    return {
      range,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        remaining: totalIncome - totalExpense,
        monthsCount: monthly.length,
        avgIncome: totalIncome / months,
        avgExpense: totalExpense / months,
      },
      monthly,
      billTypeBreakdown: this.rangeBillTypes(range),
      expenseCategoryBreakdown: this.rangeExpenseCategories(range),
      personAllowances: this.rangePersonAllowances(range),
    };
  }

  dashboard(filter: MonthFilter): DashboardData {
    const summary = this.monthSummary(filter.year, filter.month);
    const prev = prevMonth(filter.year, filter.month);
    const prevSummary = this.monthSummary(prev.year, prev.month);
    return {
      summary,
      prevSummary,
      personAllowances: this.personAllowances(filter.year, filter.month),
      billTypeBreakdown: this.billTypeBreakdown(filter.year, filter.month),
      expenseCategoryBreakdown: this.expenseCategoryBreakdown(filter.year, filter.month),
      trend6m: this.trend6m(filter.year, filter.month),
      upcoming: this.upcoming(),
    };
  }
}
