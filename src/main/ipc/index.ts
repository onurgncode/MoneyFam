import { BrowserWindow, ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import { CHANNELS } from '@shared/ipc-contract';
import type { IpcResult } from '@shared/types';
import { PersonsRepository } from '../db/repositories/persons';
import { IncomeRepository } from '../db/repositories/income';
import { BillsRepository } from '../db/repositories/bills';
import { AllowancesRepository } from '../db/repositories/allowances';
import { DebtsRepository } from '../db/repositories/debts';
import { ExpensesRepository } from '../db/repositories/expenses';
import { SettingsRepository } from '../db/repositories/settings';
import { ReportsRepository } from '../db/repositories/reports';
import { clearAllData, exportCsv, exportDb, exportPdf, restoreFromBackup } from '../backup/manual';

function wrap<T>(fn: () => T): IpcResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ipc]', msg);
    return { ok: false, error: msg };
  }
}

async function wrapAsync<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ipc]', msg);
    return { ok: false, error: msg };
  }
}

function getFocusedWindow(): BrowserWindow {
  const w = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!w) throw new Error('Aktif pencere bulunamadı');
  return w;
}

export function registerIpc(db: Database.Database): void {
  const persons = new PersonsRepository(db);
  const income = new IncomeRepository(db);
  const bills = new BillsRepository(db);
  const allowances = new AllowancesRepository(db);
  const debts = new DebtsRepository(db);
  const expenses = new ExpensesRepository(db);
  const settings = new SettingsRepository(db);
  const reports = new ReportsRepository(db);

  // persons
  ipcMain.handle(CHANNELS.personsList, () => wrap(() => persons.list()));
  ipcMain.handle(CHANNELS.personsCreate, (_e, input) => wrap(() => persons.create(input)));
  ipcMain.handle(CHANNELS.personsUpdate, (_e, id, input) =>
    wrap(() => persons.update(id, input)),
  );
  ipcMain.handle(CHANNELS.personsDelete, (_e, id) =>
    wrap(() => {
      persons.remove(id);
    }),
  );

  // income
  ipcMain.handle(CHANNELS.incomeList, (_e, filter) => wrap(() => income.list(filter)));
  ipcMain.handle(CHANNELS.incomeCreate, (_e, input) => wrap(() => income.create(input)));
  ipcMain.handle(CHANNELS.incomeUpdate, (_e, id, input) => wrap(() => income.update(id, input)));
  ipcMain.handle(CHANNELS.incomeDelete, (_e, id) =>
    wrap(() => {
      income.remove(id);
    }),
  );

  // bills
  ipcMain.handle(CHANNELS.billsList, (_e, filter) => wrap(() => bills.list(filter)));
  ipcMain.handle(CHANNELS.billsCreate, (_e, input) => wrap(() => bills.create(input)));
  ipcMain.handle(CHANNELS.billsUpdate, (_e, id, input) => wrap(() => bills.update(id, input)));
  ipcMain.handle(CHANNELS.billsDelete, (_e, id) =>
    wrap(() => {
      bills.remove(id);
    }),
  );
  ipcMain.handle(CHANNELS.billsToggleStatus, (_e, id) => wrap(() => bills.toggleStatus(id)));

  // allowances
  ipcMain.handle(CHANNELS.allowancesList, (_e, filter) => wrap(() => allowances.list(filter)));
  ipcMain.handle(CHANNELS.allowancesCreate, (_e, input) => wrap(() => allowances.create(input)));
  ipcMain.handle(CHANNELS.allowancesUpdate, (_e, id, input) =>
    wrap(() => allowances.update(id, input)),
  );
  ipcMain.handle(CHANNELS.allowancesDelete, (_e, id) =>
    wrap(() => {
      allowances.remove(id);
    }),
  );

  // debts
  ipcMain.handle(CHANNELS.debtsList, (_e, filter) => wrap(() => debts.list(filter)));
  ipcMain.handle(CHANNELS.debtsSummary, () => wrap(() => debts.summary()));
  ipcMain.handle(CHANNELS.debtsCreate, (_e, input) => wrap(() => debts.create(input)));
  ipcMain.handle(CHANNELS.debtsUpdate, (_e, id, input) => wrap(() => debts.update(id, input)));
  ipcMain.handle(CHANNELS.debtsSetActive, (_e, id, isActive) =>
    wrap(() => debts.setActive(id, isActive)),
  );
  ipcMain.handle(CHANNELS.debtsDelete, (_e, id) =>
    wrap(() => {
      debts.remove(id);
    }),
  );
  ipcMain.handle(CHANNELS.debtPaymentsList, (_e, debtId) => wrap(() => debts.paymentsList(debtId)));
  ipcMain.handle(CHANNELS.debtPaymentsCreate, (_e, input) =>
    wrap(() => debts.paymentCreate(input)),
  );
  ipcMain.handle(CHANNELS.debtPaymentsDelete, (_e, id) =>
    wrap(() => {
      debts.paymentRemove(id);
    }),
  );

  // expenses
  ipcMain.handle(CHANNELS.expensesList, (_e, filter) => wrap(() => expenses.list(filter)));
  ipcMain.handle(CHANNELS.expensesCreate, (_e, input) => wrap(() => expenses.create(input)));
  ipcMain.handle(CHANNELS.expensesUpdate, (_e, id, input) =>
    wrap(() => expenses.update(id, input)),
  );
  ipcMain.handle(CHANNELS.expensesDelete, (_e, id) =>
    wrap(() => {
      expenses.remove(id);
    }),
  );

  // settings
  ipcMain.handle(CHANNELS.settingsGetAll, () => wrap(() => settings.getAll()));
  ipcMain.handle(CHANNELS.settingsSet, (_e, key, value) => wrap(() => settings.set(key, value)));

  // dashboard
  ipcMain.handle(CHANNELS.dashboard, (_e, filter) => wrap(() => reports.dashboard(filter)));

  // reports (date range)
  ipcMain.handle(CHANNELS.reports, (_e, range) => wrap(() => reports.report(range)));

  // backup / export
  ipcMain.handle(CHANNELS.backupExportDb, () =>
    wrapAsync(() => exportDb(getFocusedWindow())),
  );
  ipcMain.handle(CHANNELS.backupExportCsv, (_e, kind) =>
    wrapAsync(() => exportCsv(getFocusedWindow(), db, kind)),
  );
  ipcMain.handle(CHANNELS.backupExportPdf, () =>
    wrapAsync(() => exportPdf(getFocusedWindow())),
  );
  ipcMain.handle(CHANNELS.backupRestore, () =>
    wrapAsync(() => restoreFromBackup(getFocusedWindow())),
  );
  ipcMain.handle(CHANNELS.backupClearAllData, () =>
    wrapAsync(() => clearAllData(getFocusedWindow(), db)),
  );
}
