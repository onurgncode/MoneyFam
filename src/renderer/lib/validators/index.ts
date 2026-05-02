import { z } from 'zod';
import { BILL_STATUSES, BILL_TYPES, EXPENSE_CATEGORIES, INCOME_SOURCES } from '@shared/constants';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih (YYYY-MM-DD)');
const positiveAmount = z
  .number({ invalid_type_error: 'Tutar bir sayı olmalı' })
  .positive('Tutar 0\'dan büyük olmalı');

export const incomeSchema = z.object({
  person_id: z.coerce.number().int().positive('Kişi seçin'),
  source: z.string().min(1, 'Kaynak gerekli'),
  amount: positiveAmount,
  date: isoDate,
  note: z.string().nullable().optional().transform((v) => v ?? null),
});
export type IncomeFormValues = z.infer<typeof incomeSchema>;

export const billSchema = z.object({
  status: z.enum(BILL_STATUSES),
  name: z.string().min(1, 'Fatura adı gerekli'),
  bill_type: z.string().min(1, 'Tür gerekli'),
  amount: positiveAmount,
  due_date: isoDate,
  paid_date: isoDate.nullable().optional().transform((v) => v ?? null),
  paid_for_person_id: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  account_no: z.string().nullable().optional().transform((v) => v ?? null),
  note: z.string().nullable().optional().transform((v) => v ?? null),
  recurring: z.coerce.number().int().min(0).max(1).default(0),
  recurring_parent_id: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});
export type BillFormValues = z.infer<typeof billSchema>;

export const expenseSchema = z.object({
  item_name: z.string().min(1, 'Ürün adı gerekli'),
  quantity: z.string().nullable().optional().transform((v) => v ?? null),
  amount: positiveAmount,
  category: z.enum(EXPENSE_CATEGORIES),
  date: isoDate,
  note: z.string().nullable().optional().transform((v) => v ?? null),
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const allowanceSchema = z.object({
  person_id: z.coerce.number().int().positive('Kişi seçin'),
  amount: positiveAmount,
  date: isoDate,
  note: z.string().nullable().optional().transform((v) => v ?? null),
});
export type AllowanceFormValues = z.infer<typeof allowanceSchema>;

export const debtSchema = z
  .object({
    name: z.string().min(1, 'Borç adı gerekli'),
    total_amount: positiveAmount,
    remaining_amount: z.number().min(0, 'Kalan tutar negatif olamaz'),
    due_date: isoDate.nullable().optional().transform((v) => v ?? null),
    note: z.string().nullable().optional().transform((v) => v ?? null),
  })
  .refine((d) => d.remaining_amount <= d.total_amount, {
    message: 'Kalan tutar toplamdan büyük olamaz',
    path: ['remaining_amount'],
  });
export type DebtFormValues = z.infer<typeof debtSchema>;

export const debtPaymentSchema = z.object({
  amount: positiveAmount,
  payment_date: isoDate,
});
export type DebtPaymentFormValues = z.infer<typeof debtPaymentSchema>;

export const personSchema = z.object({
  name: z
    .string()
    .min(1, 'İsim gerekli')
    .max(50, 'İsim 50 karakterden uzun olamaz'),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});
export type PersonFormValues = z.infer<typeof personSchema>;

export const SOURCE_OPTIONS = INCOME_SOURCES;
export const TYPE_OPTIONS = BILL_TYPES;
export const STATUS_OPTIONS = BILL_STATUSES;
export const CATEGORY_OPTIONS = EXPENSE_CATEGORIES;
