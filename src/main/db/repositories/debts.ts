import type Database from 'better-sqlite3';
import type {
  Debt,
  DebtFilter,
  DebtInput,
  DebtPayment,
  DebtPaymentInput,
  DebtSummary,
} from '@shared/types';

export class DebtsRepository {
  constructor(private db: Database.Database) {}

  list(filter: DebtFilter = {}): Debt[] {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (filter.is_active !== undefined) {
      conds.push('is_active = ?');
      params.push(filter.is_active);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return this.db
      .prepare(
        `SELECT * FROM debts ${where} ORDER BY is_active DESC, remaining_amount DESC, id DESC`,
      )
      .all(...params) as Debt[];
  }

  getById(id: number): Debt | null {
    return (this.db.prepare('SELECT * FROM debts WHERE id = ?').get(id) as Debt) ?? null;
  }

  summary(): DebtSummary {
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN is_active=1 THEN total_amount ELSE 0 END),0) AS total,
           COALESCE(SUM(CASE WHEN is_active=1 THEN total_amount - remaining_amount ELSE 0 END),0) AS paid,
           COALESCE(SUM(CASE WHEN is_active=1 THEN remaining_amount ELSE 0 END),0) AS remaining,
           COUNT(CASE WHEN is_active=1 THEN 1 END) AS activeCount
         FROM debts`,
      )
      .get() as { total: number; paid: number; remaining: number; activeCount: number };
    return row;
  }

  create(input: DebtInput): Debt {
    const result = this.db
      .prepare(
        `INSERT INTO debts (name, total_amount, remaining_amount, due_date, note, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
      )
      .run(input.name, input.total_amount, input.remaining_amount, input.due_date, input.note);
    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: Partial<DebtInput>): Debt {
    const existing = this.getById(id);
    if (!existing) throw new Error('Borç bulunamadı');
    const m = { ...existing, ...input };
    this.db
      .prepare(
        'UPDATE debts SET name = ?, total_amount = ?, remaining_amount = ?, due_date = ?, note = ? WHERE id = ?',
      )
      .run(m.name, m.total_amount, m.remaining_amount, m.due_date, m.note, id);
    return this.getById(id)!;
  }

  /** Manually toggle archive state. */
  setActive(id: number, isActive: boolean): Debt {
    this.db.prepare('UPDATE debts SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    const debt = this.getById(id);
    if (!debt) throw new Error('Borç bulunamadı');
    return debt;
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM debts WHERE id = ?').run(id);
  }

  paymentsList(debtId: number): DebtPayment[] {
    return this.db
      .prepare('SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC, id DESC')
      .all(debtId) as DebtPayment[];
  }

  paymentCreate(input: DebtPaymentInput): DebtPayment {
    return this.db.transaction(() => {
      const result = this.db
        .prepare('INSERT INTO debt_payments (debt_id, amount, payment_date) VALUES (?, ?, ?)')
        .run(input.debt_id, input.amount, input.payment_date);
      this.db
        .prepare('UPDATE debts SET remaining_amount = MAX(0, remaining_amount - ?) WHERE id = ?')
        .run(input.amount, input.debt_id);
      // Otomatik arşivleme
      this.db
        .prepare('UPDATE debts SET is_active = 0 WHERE id = ? AND remaining_amount <= 0')
        .run(input.debt_id);
      return this.db
        .prepare('SELECT * FROM debt_payments WHERE id = ?')
        .get(result.lastInsertRowid as number) as DebtPayment;
    })();
  }

  paymentRemove(id: number): void {
    this.db.transaction(() => {
      const payment = this.db
        .prepare('SELECT * FROM debt_payments WHERE id = ?')
        .get(id) as DebtPayment | undefined;
      if (!payment) return;
      this.db.prepare('DELETE FROM debt_payments WHERE id = ?').run(id);
      this.db
        .prepare('UPDATE debts SET remaining_amount = remaining_amount + ? WHERE id = ?')
        .run(payment.amount, payment.debt_id);
      // Eğer kalan > 0 ise yeniden aktif et
      this.db
        .prepare('UPDATE debts SET is_active = 1 WHERE id = ? AND remaining_amount > 0')
        .run(payment.debt_id);
    })();
  }
}
