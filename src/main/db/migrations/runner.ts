import type Database from 'better-sqlite3';
// Vite/electron-vite can inline raw text imports.
import init001 from './001_init.sql?raw';
import debtsArchive002 from './002_debts_archive.sql?raw';
import recurringBills003 from './003_recurring_bills.sql?raw';

interface Migration {
  version: number;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  { version: 1, sql: init001 },
  { version: 2, sql: debtsArchive002 },
  { version: 3, sql: recurringBills003 },
];

export function runMigrations(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.pragma(`user_version = ${m.version}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

/** Test helper: returns the raw SQL of all migrations. */
export function getAllMigrationsSql(): string {
  return MIGRATIONS.map((m) => m.sql).join('\n');
}
