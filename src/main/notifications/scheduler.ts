import { Notification, type BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import { HOUR, msUntilNext09 } from '../scheduling-helpers';

export { msUntilNext09 };

interface UpcomingRow {
  kind: 'bill' | 'debt';
  name: string;
  amount: number;
  due_date: string;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function findUrgent(db: Database.Database): UpcomingRow[] {
  const today = isoToday();
  const tomorrow = isoTomorrow();
  const bills = db
    .prepare(
      `SELECT 'bill' AS kind, name, amount, due_date FROM bills
       WHERE status IN ('Bekliyor','Gecikti') AND due_date <= ?`,
    )
    .all(tomorrow) as UpcomingRow[];
  const debts = db
    .prepare(
      `SELECT 'debt' AS kind, name, remaining_amount AS amount, due_date FROM debts
       WHERE remaining_amount > 0 AND due_date IS NOT NULL AND due_date <= ?`,
    )
    .all(tomorrow) as UpcomingRow[];
  return [...bills, ...debts].filter((r) => r.due_date <= tomorrow && r.due_date >= today);
}

function findOverdue(db: Database.Database): UpcomingRow[] {
  const today = isoToday();
  const bills = db
    .prepare(
      `SELECT 'bill' AS kind, name, amount, due_date FROM bills
       WHERE status IN ('Bekliyor','Gecikti') AND due_date < ?`,
    )
    .all(today) as UpcomingRow[];
  const debts = db
    .prepare(
      `SELECT 'debt' AS kind, name, remaining_amount AS amount, due_date FROM debts
       WHERE remaining_amount > 0 AND due_date IS NOT NULL AND due_date < ?`,
    )
    .all(today) as UpcomingRow[];
  return [...bills, ...debts];
}

function tryNotify(title: string, body: string, getWin: () => BrowserWindow | null): void {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => {
    const w = getWin();
    if (w && !w.isDestroyed()) {
      if (w.isMinimized()) w.restore();
      w.show();
      w.focus();
      w.webContents.send('app:nav', '/dashboard');
    }
  });
  n.show();
}

export function checkAndNotify(db: Database.Database, getWin: () => BrowserWindow | null): void {
  const urgent = findUrgent(db);
  const overdue = findOverdue(db);

  if (overdue.length > 0) {
    const first = overdue[0];
    const more = overdue.length > 1 ? ` (+${overdue.length - 1} diğer)` : '';
    tryNotify(
      'Gecikmiş Ödeme',
      `${first.name} ödenmedi${more}. Toplam ${overdue.length} gecikmiş kayıt var.`,
      getWin,
    );
  }
  if (urgent.length > 0) {
    const first = urgent[0];
    const more = urgent.length > 1 ? ` (+${urgent.length - 1} diğer)` : '';
    tryNotify(
      'Yaklaşan Ödeme',
      `${first.name} bugün/yarın son ödeme${more}.`,
      getWin,
    );
  }
}

let timeoutHandle: NodeJS.Timeout | null = null;

export function startNotificationScheduler(
  db: Database.Database,
  getWin: () => BrowserWindow | null,
): void {
  // İlk açılışta hemen kontrol et (kullanıcı sabah 9'dan önce açtıysa kayıp olmaz)
  setTimeout(() => checkAndNotify(db, getWin), 5000);
  scheduleNext(db, getWin);
}

function scheduleNext(
  db: Database.Database,
  getWin: () => BrowserWindow | null,
): void {
  if (timeoutHandle) clearTimeout(timeoutHandle);
  const ms = msUntilNext09();
  timeoutHandle = setTimeout(() => {
    checkAndNotify(db, getWin);
    scheduleNext(db, getWin);
  }, ms);
  // Uyku modu kayma kontrolü
  setTimeout(() => scheduleNext(db, getWin), 24 * HOUR + HOUR);
}

export function stopNotificationScheduler(): void {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
}
