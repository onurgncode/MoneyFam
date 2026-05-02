import type Database from 'better-sqlite3';
import type { CsvKind } from '@shared/types';

const TABLES: Record<Exclude<CsvKind, 'all'>, string> = {
  income: 'income',
  bills: 'bills',
  allowances: 'allowances',
  expenses: 'expenses',
  debts: 'debts',
  debt_payments: 'debt_payments',
};

function escapeCsv(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const dataLines = rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function buildCsv(db: Database.Database, kind: CsvKind): string {
  if (kind === 'all') {
    const sections: string[] = [];
    for (const [k, table] of Object.entries(TABLES) as Array<[Exclude<CsvKind, 'all'>, string]>) {
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as Record<
        string,
        unknown
      >[];
      sections.push(`# ${k}`);
      sections.push(rows.length ? rowsToCsv(rows) : '(boş)');
      sections.push('');
    }
    return sections.join('\n');
  }
  const table = TABLES[kind];
  if (!table) throw new Error(`Geçersiz tip: ${kind}`);
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as Record<
    string,
    unknown
  >[];
  return rowsToCsv(rows);
}
