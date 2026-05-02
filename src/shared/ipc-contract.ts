import type {
  Allowance,
  AllowanceFilter,
  AllowanceInput,
  Bill,
  BillFilter,
  BillInput,
  CsvKind,
  DashboardData,
  DateRange,
  Debt,
  DebtFilter,
  DebtInput,
  DebtPayment,
  DebtPaymentInput,
  DebtSummary,
  Expense,
  ExpenseFilter,
  ExpenseInput,
  Income,
  IncomeFilter,
  IncomeInput,
  IpcResult,
  MonthFilter,
  Person,
  PersonInput,
  ReportData,
  SettingRow,
} from './types';

/**
 * Channel registry. Channel names live ONLY here so renderer/main stay in sync.
 */
export const CHANNELS = {
  // persons
  personsList: 'persons:list',
  personsCreate: 'persons:create',
  personsUpdate: 'persons:update',
  personsDelete: 'persons:delete',
  // income
  incomeList: 'income:list',
  incomeCreate: 'income:create',
  incomeUpdate: 'income:update',
  incomeDelete: 'income:delete',
  // bills
  billsList: 'bills:list',
  billsCreate: 'bills:create',
  billsUpdate: 'bills:update',
  billsDelete: 'bills:delete',
  billsToggleStatus: 'bills:toggleStatus',
  // allowances
  allowancesList: 'allowances:list',
  allowancesCreate: 'allowances:create',
  allowancesUpdate: 'allowances:update',
  allowancesDelete: 'allowances:delete',
  // debts
  debtsList: 'debts:list',
  debtsSummary: 'debts:summary',
  debtsCreate: 'debts:create',
  debtsUpdate: 'debts:update',
  debtsDelete: 'debts:delete',
  debtsSetActive: 'debts:setActive',
  debtPaymentsList: 'debtPayments:list',
  debtPaymentsCreate: 'debtPayments:create',
  debtPaymentsDelete: 'debtPayments:delete',
  // expenses
  expensesList: 'expenses:list',
  expensesCreate: 'expenses:create',
  expensesUpdate: 'expenses:update',
  expensesDelete: 'expenses:delete',
  // settings
  settingsGetAll: 'settings:getAll',
  settingsSet: 'settings:set',
  // dashboard / reports
  dashboard: 'dashboard:get',
  reports: 'reports:get',
  // backup / export / data ops
  backupExportDb: 'backup:exportDb',
  backupExportCsv: 'backup:exportCsv',
  backupExportPdf: 'backup:exportPdf',
  backupRestore: 'backup:restore',
  backupClearAllData: 'backup:clearAllData',
} as const;

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS];

/* ---- IPC API surface (used by preload to type window.api) ---- */

export interface IpcApi {
  persons: {
    list: () => Promise<IpcResult<Person[]>>;
    create: (input: PersonInput) => Promise<IpcResult<Person>>;
    update: (id: number, input: Partial<PersonInput>) => Promise<IpcResult<Person>>;
    remove: (id: number) => Promise<IpcResult<void>>;
  };
  income: {
    list: (filter: IncomeFilter) => Promise<IpcResult<Income[]>>;
    create: (input: IncomeInput) => Promise<IpcResult<Income>>;
    update: (id: number, input: Partial<IncomeInput>) => Promise<IpcResult<Income>>;
    remove: (id: number) => Promise<IpcResult<void>>;
  };
  bills: {
    list: (filter: BillFilter) => Promise<IpcResult<Bill[]>>;
    create: (input: BillInput) => Promise<IpcResult<Bill>>;
    update: (id: number, input: Partial<BillInput>) => Promise<IpcResult<Bill>>;
    remove: (id: number) => Promise<IpcResult<void>>;
    toggleStatus: (id: number) => Promise<IpcResult<Bill>>;
  };
  allowances: {
    list: (filter: AllowanceFilter) => Promise<IpcResult<Allowance[]>>;
    create: (input: AllowanceInput) => Promise<IpcResult<Allowance>>;
    update: (id: number, input: Partial<AllowanceInput>) => Promise<IpcResult<Allowance>>;
    remove: (id: number) => Promise<IpcResult<void>>;
  };
  debts: {
    list: (filter?: DebtFilter) => Promise<IpcResult<Debt[]>>;
    summary: () => Promise<IpcResult<DebtSummary>>;
    create: (input: DebtInput) => Promise<IpcResult<Debt>>;
    update: (id: number, input: Partial<DebtInput>) => Promise<IpcResult<Debt>>;
    setActive: (id: number, isActive: boolean) => Promise<IpcResult<Debt>>;
    remove: (id: number) => Promise<IpcResult<void>>;
    paymentsList: (debtId: number) => Promise<IpcResult<DebtPayment[]>>;
    paymentCreate: (input: DebtPaymentInput) => Promise<IpcResult<DebtPayment>>;
    paymentRemove: (id: number) => Promise<IpcResult<void>>;
  };
  expenses: {
    list: (filter: ExpenseFilter) => Promise<IpcResult<Expense[]>>;
    create: (input: ExpenseInput) => Promise<IpcResult<Expense>>;
    update: (id: number, input: Partial<ExpenseInput>) => Promise<IpcResult<Expense>>;
    remove: (id: number) => Promise<IpcResult<void>>;
  };
  settings: {
    getAll: () => Promise<IpcResult<SettingRow[]>>;
    set: (key: string, value: string) => Promise<IpcResult<SettingRow>>;
  };
  dashboard: {
    get: (filter: MonthFilter) => Promise<IpcResult<DashboardData>>;
  };
  reports: {
    get: (range: DateRange) => Promise<IpcResult<ReportData>>;
  };
  backup: {
    exportDb: () => Promise<IpcResult<{ saved: boolean; path?: string }>>;
    exportCsv: (kind: CsvKind) => Promise<IpcResult<{ saved: boolean; path?: string }>>;
    exportPdf: () => Promise<IpcResult<{ saved: boolean; path?: string }>>;
    restore: () => Promise<IpcResult<{ restored: boolean; preBackupPath?: string }>>;
    clearAllData: () => Promise<IpcResult<boolean>>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
