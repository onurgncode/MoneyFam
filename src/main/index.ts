import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { getDb, closeDb } from './db/connection';
import { runMigrations } from './db/migrations/runner';
import { seedDefaults, seedDemo } from './db/seed';
import { registerIpc } from './ipc';
import { buildAppMenu } from './menu';
import { BillsRepository } from './db/repositories/bills';
import { startBackupScheduler } from './backup/auto-weekly';
import { startNotificationScheduler } from './notifications/scheduler';

const SHOULD_SEED_DEMO =
  process.argv.includes('--seed-demo') || process.env.SEED_DEMO === '1';

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}

async function bootstrap(): Promise<void> {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  await app.whenReady();

  app.setName('MoneyFam');

  const db = getDb();
  runMigrations(db);
  seedDefaults(db);
  if (SHOULD_SEED_DEMO) seedDemo(db);

  // Tekrar eden faturaları işle: eksik aylar için 'Bekliyor' kayıtları oluştur
  try {
    const generated = new BillsRepository(db).processRecurring();
    if (generated > 0) console.log(`[recurring] generated ${generated} bills`);
  } catch (err) {
    console.error('[recurring] failed:', err);
  }

  registerIpc(db);

  const win = createWindow();
  buildAppMenu(win);

  // Arka plan zamanlayıcılar
  startBackupScheduler();
  startNotificationScheduler(db, () => win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('second-instance', () => {
    const existing = BrowserWindow.getAllWindows()[0];
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      closeDb();
      app.quit();
    }
  });

  app.on('before-quit', () => closeDb());
}

bootstrap().catch((err) => {
  console.error('[main] bootstrap failed:', err);
  app.exit(1);
});
