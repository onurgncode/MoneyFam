import type Database from 'better-sqlite3';
import type { Income, IncomeFilter, IncomeInput } from '@shared/types';
import { monthRange } from './_helpers';

export class IncomeRepository {
  constructor(private db: Database.Database) {}

  list(filter: IncomeFilter): Income[] {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (filter.year && filter.month) {
      const [start, end] = monthRange(filter.year, filter.month);
      conds.push('date >= ? AND date <= ?');
      params.push(start, end);
    }
    if (filter.person_id) {
      conds.push('person_id = ?');
      params.push(filter.person_id);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT * FROM income ${where} ORDER BY date DESC, id DESC`)
      .all(...params) as Income[];
  }

  getById(id: number): Income | null {
    return (this.db.prepare('SELECT * FROM income WHERE id = ?').get(id) as Income) ?? null;
  }

  create(input: IncomeInput): Income {
    const result = this.db
      .prepare(
        'INSERT INTO income (person_id, source, amount, date, note) VALUES (?, ?, ?, ?, ?)',
      )
      .run(input.person_id, input.source, input.amount, input.date, input.note);
    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: Partial<IncomeInput>): Income {
    const existing = this.getById(id);
    if (!existing) throw new Error('Gelir kaydı bulunamadı');
    const m = { ...existing, ...input };
    this.db
      .prepare(
        'UPDATE income SET person_id = ?, source = ?, amount = ?, date = ?, note = ? WHERE id = ?',
      )
      .run(m.person_id, m.source, m.amount, m.date, m.note, id);
    return this.getById(id)!;
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM income WHERE id = ?').run(id);
  }
}
