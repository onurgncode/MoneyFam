import type Database from 'better-sqlite3';
import type { Expense, ExpenseFilter, ExpenseInput } from '@shared/types';
import { monthRange } from './_helpers';

export class ExpensesRepository {
  constructor(private db: Database.Database) {}

  list(filter: ExpenseFilter): Expense[] {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (filter.year && filter.month) {
      const [start, end] = monthRange(filter.year, filter.month);
      conds.push('date >= ? AND date <= ?');
      params.push(start, end);
    }
    if (filter.category) {
      conds.push('category = ?');
      params.push(filter.category);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT * FROM expenses ${where} ORDER BY date DESC, id DESC`)
      .all(...params) as Expense[];
  }

  getById(id: number): Expense | null {
    return (this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense) ?? null;
  }

  create(input: ExpenseInput): Expense {
    const result = this.db
      .prepare(
        'INSERT INTO expenses (item_name, quantity, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(input.item_name, input.quantity, input.amount, input.category, input.date, input.note);
    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: Partial<ExpenseInput>): Expense {
    const existing = this.getById(id);
    if (!existing) throw new Error('Harcama bulunamadı');
    const m = { ...existing, ...input };
    this.db
      .prepare(
        'UPDATE expenses SET item_name = ?, quantity = ?, amount = ?, category = ?, date = ?, note = ? WHERE id = ?',
      )
      .run(m.item_name, m.quantity, m.amount, m.category, m.date, m.note, id);
    return this.getById(id)!;
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  }
}
