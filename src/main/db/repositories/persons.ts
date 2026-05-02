import type Database from 'better-sqlite3';
import type { Person, PersonInput } from '@shared/types';

export class PersonsRepository {
  constructor(private db: Database.Database) {}

  list(): Person[] {
    return this.db
      .prepare('SELECT * FROM persons ORDER BY is_active DESC, name COLLATE NOCASE')
      .all() as Person[];
  }

  getById(id: number): Person | null {
    return (this.db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as Person) ?? null;
  }

  create(input: PersonInput): Person {
    const result = this.db
      .prepare('INSERT INTO persons (name, is_active) VALUES (?, ?)')
      .run(input.name, input.is_active);
    return this.getById(result.lastInsertRowid as number)!;
  }

  update(id: number, input: Partial<PersonInput>): Person {
    const existing = this.getById(id);
    if (!existing) throw new Error('Kişi bulunamadı');
    const merged = { ...existing, ...input };
    this.db
      .prepare('UPDATE persons SET name = ?, is_active = ? WHERE id = ?')
      .run(merged.name, merged.is_active, id);
    return this.getById(id)!;
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM persons WHERE id = ?').run(id);
  }
}
