import type { Allowance, Bill } from '@shared/types';
import { isInMonth } from './_helpers';

export interface PersonAllowanceResult {
  cash: number;
  bills: number;
  total: number;
}

/**
 * Allowance for a person in a given month:
 *   cash = sum of allowance entries (date in month)
 * + bills = sum of bills paid for this person (status='Ödendi', paid_date in month)
 */
export function computePersonAllowance(
  personId: number,
  year: number,
  month: number,
  allowances: Allowance[],
  bills: Bill[],
): PersonAllowanceResult {
  const cash = allowances
    .filter((a) => a.person_id === personId && isInMonth(a.date, year, month))
    .reduce((sum, a) => sum + a.amount, 0);

  const billsTotal = bills
    .filter(
      (b) =>
        b.paid_for_person_id === personId &&
        b.status === 'Ödendi' &&
        b.paid_date != null &&
        isInMonth(b.paid_date, year, month),
    )
    .reduce((sum, b) => sum + b.amount, 0);

  return { cash, bills: billsTotal, total: cash + billsTotal };
}
