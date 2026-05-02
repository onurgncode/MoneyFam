import { app, dialog, BrowserWindow } from 'electron';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import type { CsvKind } from '@shared/types';
import { buildCsv } from './csv';

function timestamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export interface BackupResult {
  saved: boolean;
  path?: string;
}

export async function exportDb(win: BrowserWindow): Promise<BackupResult> {
  const result = await dialog.showSaveDialog(win, {
    title: 'Veritabanını yedekle',
    defaultPath: `moneyfam-yedek-${timestamp()}.db`,
    filters: [{ name: 'SQLite Veritabanı', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { saved: false };
  // Source path is the same as connection.ts
  const src = join(app.getPath('userData'), 'budget.db');
  copyFileSync(src, result.filePath);
  return { saved: true, path: result.filePath };
}

export async function exportCsv(
  win: BrowserWindow,
  db: Database.Database,
  kind: CsvKind,
): Promise<BackupResult> {
  const result = await dialog.showSaveDialog(win, {
    title: 'CSV olarak dışa aktar',
    defaultPath: `moneyfam-${kind}-${timestamp()}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || !result.filePath) return { saved: false };
  const csv = buildCsv(db, kind);
  // BOM ekle, Excel Türkçe karakter doğru gösterir
  writeFileSync(result.filePath, '\uFEFF' + csv, 'utf-8');
  return { saved: true, path: result.filePath };
}

export async function exportPdf(win: BrowserWindow): Promise<BackupResult> {
  const result = await dialog.showSaveDialog(win, {
    title: 'PDF olarak dışa aktar',
    defaultPath: `moneyfam-rapor-${timestamp()}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { saved: false };
  const pdf = await win.webContents.printToPDF({
    pageSize: 'A4',
    landscape: false,
    printBackground: true,
    margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
  });
  writeFileSync(result.filePath, pdf);
  return { saved: true, path: result.filePath };
}

export interface RestoreResult {
  restored: boolean;
  preBackupPath?: string;
}

export async function restoreFromBackup(win: BrowserWindow): Promise<RestoreResult> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Yedekten geri yükle',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Veritabanı', extensions: ['db'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { restored: false };

  const confirm = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Geri yükleme onayı',
    message: 'Mevcut veriler değiştirilecek',
    detail:
      'Mevcut veritabanı seçilen yedek ile değiştirilecek. Önce mevcut verileriniz otomatik olarak yedeklenecek. Devam ettikten sonra uygulama yeniden başlatılacaktır.',
    buttons: ['İptal', 'Geri Yükle'],
    cancelId: 0,
    defaultId: 1,
  });
  if (confirm.response !== 1) return { restored: false };

  const userData = app.getPath('userData');
  const dbDest = join(userData, 'budget.db');
  const backupsDir = join(userData, 'backups');
  mkdirSync(backupsDir, { recursive: true });
  const preBackupPath = join(backupsDir, `budget-pre-restore-${timestamp()}.db`);

  try {
    copyFileSync(dbDest, preBackupPath);
  } catch (err) {
    throw new Error(
      `Mevcut veritabanı yedeklenemedi: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  copyFileSync(result.filePaths[0], dbDest);
  // Restart so SQLite handle is fresh & migrations re-run
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);
  return { restored: true, preBackupPath };
}

export async function clearAllData(win: BrowserWindow, db: Database.Database): Promise<boolean> {
  const result = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Tüm verileri sil',
    message: 'Tüm veriler kalıcı olarak silinecek',
    detail:
      'Bu işlem geri alınamaz. Tüm gelir, fatura, harçlık, borç ve harcama kayıtlarınız silinecek. Devam etmek istiyor musunuz?',
    buttons: ['İptal', 'Evet, Tüm Verileri Sil'],
    cancelId: 0,
    defaultId: 0,
  });
  if (result.response !== 1) return false;
  // İkinci onay
  const confirm = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Son onay',
    message: 'Gerçekten emin misiniz?',
    detail: 'Tüm veriler silinecek. Yedekleme yaptığınızdan emin olun.',
    buttons: ['İptal', 'Verileri Sil'],
    cancelId: 0,
    defaultId: 0,
  });
  if (confirm.response !== 1) return false;
  db.exec('BEGIN');
  try {
    // Sırasıyla foreign key bağımlılıklarını gözeterek temizle
    db.exec(`
      DELETE FROM debt_payments;
      DELETE FROM debts;
      DELETE FROM expenses;
      DELETE FROM allowances;
      DELETE FROM bills;
      DELETE FROM income;
      DELETE FROM persons;
    `);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return true;
}
