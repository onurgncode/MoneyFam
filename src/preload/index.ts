import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS, type IpcApi } from '@shared/ipc-contract';

const inv = ipcRenderer.invoke.bind(ipcRenderer);

const api: IpcApi = {
  persons: {
    list: () => inv(CHANNELS.personsList),
    create: (input) => inv(CHANNELS.personsCreate, input),
    update: (id, input) => inv(CHANNELS.personsUpdate, id, input),
    remove: (id) => inv(CHANNELS.personsDelete, id),
  },
  income: {
    list: (filter) => inv(CHANNELS.incomeList, filter),
    create: (input) => inv(CHANNELS.incomeCreate, input),
    update: (id, input) => inv(CHANNELS.incomeUpdate, id, input),
    remove: (id) => inv(CHANNELS.incomeDelete, id),
  },
  bills: {
    list: (filter) => inv(CHANNELS.billsList, filter),
    create: (input) => inv(CHANNELS.billsCreate, input),
    update: (id, input) => inv(CHANNELS.billsUpdate, id, input),
    remove: (id) => inv(CHANNELS.billsDelete, id),
    toggleStatus: (id) => inv(CHANNELS.billsToggleStatus, id),
  },
  allowances: {
    list: (filter) => inv(CHANNELS.allowancesList, filter),
    create: (input) => inv(CHANNELS.allowancesCreate, input),
    update: (id, input) => inv(CHANNELS.allowancesUpdate, id, input),
    remove: (id) => inv(CHANNELS.allowancesDelete, id),
  },
  debts: {
    list: (filter) => inv(CHANNELS.debtsList, filter),
    summary: () => inv(CHANNELS.debtsSummary),
    create: (input) => inv(CHANNELS.debtsCreate, input),
    update: (id, input) => inv(CHANNELS.debtsUpdate, id, input),
    setActive: (id, isActive) => inv(CHANNELS.debtsSetActive, id, isActive),
    remove: (id) => inv(CHANNELS.debtsDelete, id),
    paymentsList: (id) => inv(CHANNELS.debtPaymentsList, id),
    paymentCreate: (input) => inv(CHANNELS.debtPaymentsCreate, input),
    paymentRemove: (id) => inv(CHANNELS.debtPaymentsDelete, id),
  },
  expenses: {
    list: (filter) => inv(CHANNELS.expensesList, filter),
    create: (input) => inv(CHANNELS.expensesCreate, input),
    update: (id, input) => inv(CHANNELS.expensesUpdate, id, input),
    remove: (id) => inv(CHANNELS.expensesDelete, id),
  },
  settings: {
    getAll: () => inv(CHANNELS.settingsGetAll),
    set: (key, value) => inv(CHANNELS.settingsSet, key, value),
  },
  dashboard: {
    get: (filter) => inv(CHANNELS.dashboard, filter),
  },
  reports: {
    get: (range) => inv(CHANNELS.reports, range),
  },
  backup: {
    exportDb: () => inv(CHANNELS.backupExportDb),
    exportCsv: (kind) => inv(CHANNELS.backupExportCsv, kind),
    exportPdf: () => inv(CHANNELS.backupExportPdf),
    restore: () => inv(CHANNELS.backupRestore),
    clearAllData: () => inv(CHANNELS.backupClearAllData),
  },
};

contextBridge.exposeInMainWorld('api', api);

// Menu → renderer events
contextBridge.exposeInMainWorld('appEvents', {
  onNav: (cb: (path: string) => void) => {
    const handler = (_e: unknown, path: string): void => cb(path);
    ipcRenderer.on('app:nav', handler);
    return () => ipcRenderer.off('app:nav', handler);
  },
  onNew: (cb: () => void) => {
    const handler = (): void => cb();
    ipcRenderer.on('app:new', handler);
    return () => ipcRenderer.off('app:new', handler);
  },
  onExport: (cb: () => void) => {
    const handler = (): void => cb();
    ipcRenderer.on('app:export', handler);
    return () => ipcRenderer.off('app:export', handler);
  },
});
