import type Database from 'better-sqlite3';
import type { SettingRow } from '@shared/types';

export class SettingsRepository {
  constructor(private db: Database.Database) {}

  getAll(): SettingRow[] {
    return this.db.prepare('SELECT key, value FROM settings ORDER BY key').all() as SettingRow[];
  }

  get(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): SettingRow {
    this.db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, value);
    return { key, value };
  }
}
