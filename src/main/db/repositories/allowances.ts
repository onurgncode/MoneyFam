import type Database from 'better-sqlite3';
import type { Allowance, AllowanceFilter, AllowanceInput } from '@shared/types';
import { monthRange } from './_helpers';

export class AllowancesRepository {
  constructor(private db: Database.Database) {}

  list(filter: AllowanceFilter): Allowance[] {
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
      .prepare(`SELECT * FROM allowances ${where} ORDER BY date DESC, id DESC`)
      .all(...params) as Allowance[];
  }

  getById(id: number): Allowance | null {
    return (this.db.prepare('SELECT * FROM allowances WHERE id = ?').get(id) as Allowance) ?? null;
  }

  create(input: AllowanceInput): Allowance {
    const result = this.db
      .prepare('INSERT INTO allowances (person_id, amount, date, note) VALUES (?, ?, ?, ?)')
      .run(input.person_id, input.amount, input.date, input.note);
    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: Partial<AllowanceInput>): Allowance {
    const existing = this.getById(id);
    if (!existing) throw new Error('Harçlık kaydı bulunamadı');
    const m = { ...existing, ...input };
    this.db
      .prepare('UPDATE allowances SET person_id = ?, amount = ?, date = ?, note = ? WHERE id = ?')
      .run(m.person_id, m.amount, m.date, m.note, id);
    return this.getById(id)!;
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM allowances WHERE id = ?').run(id);
  }
}
