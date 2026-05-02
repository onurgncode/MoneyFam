import type Database from 'better-sqlite3';
import type { Bill, BillFilter, BillInput } from '@shared/types';
import type { BillStatus } from '@shared/constants';
import { isoToday, monthRange } from './_helpers';
import {
  clampDayOfMonth,
  nextMonth,
  parseDayOfMonth,
  ymFromIso,
  ymOf,
} from '../../scheduling-helpers';

const STATUS_CYCLE: BillStatus[] = ['Bekliyor', 'Ödendi', 'Gecikti'];

const MAX_RECURRING_LOOKAHEAD = 12;

export class BillsRepository {
  constructor(private db: Database.Database) {}

  list(filter: BillFilter): Bill[] {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (filter.year && filter.month) {
      const [start, end] = monthRange(filter.year, filter.month);
      conds.push(
        '((due_date >= ? AND due_date <= ?) OR (paid_date IS NOT NULL AND paid_date >= ? AND paid_date <= ?))',
      );
      params.push(start, end, start, end);
    }
    if (filter.status) {
      conds.push('status = ?');
      params.push(filter.status);
    }
    if (filter.bill_type) {
      conds.push('bill_type = ?');
      params.push(filter.bill_type);
    }
    if (filter.paid_for_person_id !== undefined) {
      if (filter.paid_for_person_id === null) {
        conds.push('paid_for_person_id IS NULL');
      } else {
        conds.push('paid_for_person_id = ?');
        params.push(filter.paid_for_person_id);
      }
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return this.db
      .prepare(`SELECT * FROM bills ${where} ORDER BY due_date DESC, id DESC`)
      .all(...params) as Bill[];
  }

  getById(id: number): Bill | null {
    return (this.db.prepare('SELECT * FROM bills WHERE id = ?').get(id) as Bill) ?? null;
  }

  create(input: BillInput): Bill {
    const result = this.db
      .prepare(
        `INSERT INTO bills (status, name, bill_type, amount, due_date, paid_date,
                            paid_for_person_id, account_no, note, recurring, recurring_parent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.status,
        input.name,
        input.bill_type,
        input.amount,
        input.due_date,
        input.paid_date,
        input.paid_for_person_id,
        input.account_no,
        input.note,
        input.recurring ?? 0,
        input.recurring_parent_id ?? null,
      );
    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: Partial<BillInput>): Bill {
    const existing = this.getById(id);
    if (!existing) throw new Error('Fatura bulunamadı');
    const m = { ...existing, ...input };
    this.db
      .prepare(
        `UPDATE bills SET status = ?, name = ?, bill_type = ?, amount = ?, due_date = ?,
            paid_date = ?, paid_for_person_id = ?, account_no = ?, note = ?,
            recurring = ?, recurring_parent_id = ?
         WHERE id = ?`,
      )
      .run(
        m.status,
        m.name,
        m.bill_type,
        m.amount,
        m.due_date,
        m.paid_date,
        m.paid_for_person_id,
        m.account_no,
        m.note,
        m.recurring,
        m.recurring_parent_id,
        id,
      );
    return this.getById(id)!;
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM bills WHERE id = ?').run(id);
  }

  /** Cycles status: Bekliyor → Ödendi → Gecikti → Bekliyor. Auto-fills paid_date. */
  toggleStatus(id: number): Bill {
    const existing = this.getById(id);
    if (!existing) throw new Error('Fatura bulunamadı');
    const idx = STATUS_CYCLE.indexOf(existing.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    const paidDate = next === 'Ödendi' ? existing.paid_date ?? isoToday() : null;
    this.db
      .prepare('UPDATE bills SET status = ?, paid_date = ? WHERE id = ?')
      .run(next, paidDate, id);
    return this.getById(id)!;
  }

  /**
   * For each recurring template, walks forward from the latest known instance
   * to the current month and auto-creates missing months as `Bekliyor` entries
   * with the same day-of-month and last known amount.
   *
   * Returns the number of bills generated.
   */
  processRecurring(today: Date = new Date()): number {
    const templates = this.db
      .prepare('SELECT * FROM bills WHERE recurring = 1 AND recurring_parent_id IS NULL')
      .all() as Bill[];

    let created = 0;
    const tx = this.db.transaction(() => {
      for (const tpl of templates) {
        // Find most recent instance (template itself OR any child)
        const latestRow = this.db
          .prepare(
            `SELECT id, due_date, amount FROM bills
             WHERE id = ? OR recurring_parent_id = ?
             ORDER BY due_date DESC, id DESC LIMIT 1`,
          )
          .get(tpl.id, tpl.id) as { id: number; due_date: string; amount: number } | undefined;
        if (!latestRow) continue;

        const dom = parseDayOfMonth(tpl.due_date);
        const currYM = ymOf(today);
        const latestYM = ymFromIso(latestRow.due_date);

        let cursor = nextMonth(latestYM);
        let safety = 0;
        while (
          (cursor.year < currYM.year ||
            (cursor.year === currYM.year && cursor.month <= currYM.month)) &&
          safety < MAX_RECURRING_LOOKAHEAD
        ) {
          const due = clampDayOfMonth(cursor.year, cursor.month, dom);
          this.db
            .prepare(
              `INSERT INTO bills (status, name, bill_type, amount, due_date, paid_date,
                                  paid_for_person_id, account_no, note, recurring, recurring_parent_id)
               VALUES ('Bekliyor', ?, ?, ?, ?, NULL, ?, ?, ?, 0, ?)`,
            )
            .run(
              tpl.name,
              tpl.bill_type,
              latestRow.amount,
              due,
              tpl.paid_for_person_id,
              tpl.account_no,
              tpl.note,
              tpl.id,
            );
          created += 1;
          cursor = nextMonth(cursor);
          safety += 1;
        }
      }
    });
    tx();
    return created;
  }
}

