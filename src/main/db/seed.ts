import type Database from 'better-sqlite3';
import { DEFAULT_SETTINGS } from '@shared/constants';

/** Idempotent: ensures default settings exist. Persons are NOT seeded —
 *  user adds their own household members via the Kişiler page. */
export function seedDefaults(db: Database.Database): void {
  const tx = db.transaction(() => {
    const insertSetting = db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    );
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);
  });
  tx();
}

/** Demo seed: 3 months of varied data. Only runs if expense table is empty. */
export function seedDemo(db: Database.Database): void {
  const expenseCount = db.prepare('SELECT COUNT(*) AS c FROM expenses').get() as { c: number };
  if (expenseCount.c > 0) return;

  // Demo veri belirli isimlere atıfta bulunduğu için, yoksa ekle.
  // Bu sadece --seed-demo modunda çalışır; gerçek kullanıcılar etkilenmez.
  const insertDemoPerson = db.prepare(
    'INSERT OR IGNORE INTO persons (name, is_active) VALUES (?, 1)',
  );
  for (const name of ['ONUR', 'MAHMUT', 'SULTAN']) insertDemoPerson.run(name);

  const persons = db.prepare('SELECT id, name FROM persons WHERE is_active = 1').all() as Array<{
    id: number;
    name: string;
  }>;
  if (persons.length === 0) return;

  const today = new Date();
  const isoForOffset = (monthsBack: number, day: number): string => {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsBack, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const insertIncome = db.prepare(
    'INSERT INTO income (person_id, source, amount, date, note) VALUES (?, ?, ?, ?, ?)',
  );
  const insertBill = db.prepare(
    `INSERT INTO bills (status, name, bill_type, amount, due_date, paid_date,
                        paid_for_person_id, account_no, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertAllowance = db.prepare(
    'INSERT INTO allowances (person_id, amount, date, note) VALUES (?, ?, ?, ?)',
  );
  const insertExpense = db.prepare(
    'INSERT INTO expenses (item_name, quantity, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertDebt = db.prepare(
    'INSERT INTO debts (name, total_amount, remaining_amount, due_date, note) VALUES (?, ?, ?, ?, ?)',
  );
  const insertDebtPayment = db.prepare(
    'INSERT INTO debt_payments (debt_id, amount, payment_date) VALUES (?, ?, ?)',
  );

  const onur = persons.find((p) => p.name === 'ONUR') ?? persons[0];
  const mahmut = persons.find((p) => p.name === 'MAHMUT') ?? persons[0];
  const sultan = persons.find((p) => p.name === 'SULTAN') ?? persons[0];

  db.transaction(() => {
    for (let m = 2; m >= 0; m--) {
      // Maaş
      insertIncome.run(mahmut.id, 'MAAŞ', 45000, isoForOffset(m, 1), 'Aylık maaş');
      insertIncome.run(sultan.id, 'MAAŞ', 38000, isoForOffset(m, 1), 'Aylık maaş');
      if (m === 1) insertIncome.run(onur.id, 'EK GELİR', 5000, isoForOffset(m, 15), 'Freelance');

      // Faturalar (ev)
      insertBill.run(
        'Ödendi', 'Elektrik', 'Elektrik', 1250, isoForOffset(m, 10), isoForOffset(m, 8),
        null, 'EL-12345', null,
      );
      insertBill.run(
        'Ödendi', 'Su', 'Su', 380, isoForOffset(m, 12), isoForOffset(m, 11),
        null, 'SU-998877', null,
      );
      insertBill.run(
        'Ödendi', 'Doğalgaz', 'Doğalgaz', 920, isoForOffset(m, 14), isoForOffset(m, 13),
        null, null, null,
      );
      insertBill.run(
        'Ödendi', 'İnternet', 'İnternet', 540, isoForOffset(m, 5), isoForOffset(m, 4),
        null, 'TT-44556', null,
      );
      insertBill.run(
        'Ödendi', 'Kira', 'Kira', 18000, isoForOffset(m, 1), isoForOffset(m, 1),
        null, null, null,
      );

      // Faturalar (kişisel)
      insertBill.run(
        'Ödendi', 'Onur Telefon', 'Turkcell', 600, isoForOffset(m, 20), isoForOffset(m, 19),
        onur.id, 'TC-11122', null,
      );
      insertBill.run(
        'Ödendi', 'Mahmut Telefon', 'Vodafone', 450, isoForOffset(m, 22), isoForOffset(m, 21),
        mahmut.id, 'VF-33344', null,
      );
      insertBill.run(
        'Ödendi', 'Sultan Telefon', 'Türk Telekom', 380, isoForOffset(m, 23), isoForOffset(m, 22),
        sultan.id, null, null,
      );

      // Nakit harçlık
      insertAllowance.run(onur.id, 1000, isoForOffset(m, 5), 'Aylık nakit');
      insertAllowance.run(mahmut.id, 2000, isoForOffset(m, 5), 'Aylık nakit');
      insertAllowance.run(sultan.id, 2000, isoForOffset(m, 5), 'Aylık nakit');

      // Harcamalar
      const expenseSamples: Array<[string, string | null, number, string, number]> = [
        ['Pazar alışverişi', '15 kg', 850, 'Yemek', 7],
        ['Et', '3 kg', 1200, 'Yemek', 9],
        ['Süt', '4 lt', 220, 'Yemek', 11],
        ['Çamaşır deterjanı', '5 lt', 320, 'Temizlik', 14],
        ['Tişört', '2 adet', 480, 'Giyim', 17],
        ['Sebze meyve', null, 540, 'Yemek', 18],
        ['Otobüs kart', null, 350, 'Ulaşım', 19],
        ['Diş hekimi', null, 1500, 'Sağlık', 25],
        ['Tabak takımı', '6 parça', 680, 'Eşya', 27],
        ['Sabun', '4 adet', 95, 'Temizlik', 28],
      ];
      for (const [name, qty, amt, cat, day] of expenseSamples) {
        insertExpense.run(name, qty, amt, cat, isoForOffset(m, day), null);
      }
    }

    // Borç
    const debtId = insertDebt.run(
      'Buzdolabı taksiti', 24000, 16000, isoForOffset(-1, 15), '12 taksit',
    ).lastInsertRowid as number;
    insertDebtPayment.run(debtId, 2000, isoForOffset(2, 15));
    insertDebtPayment.run(debtId, 2000, isoForOffset(1, 15));
    insertDebtPayment.run(debtId, 2000, isoForOffset(0, 15));

    // Bekleyen fatura (yaklaşan ödeme widget'ı için)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    insertBill.run('Bekliyor', 'Aidat', 'Diğer', 750, tomorrowIso, null, null, null, null);
  })();
}
