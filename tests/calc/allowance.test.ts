import { describe, expect, it } from 'vitest';
import { computePersonAllowance } from '@renderer/lib/calc/allowance';
import type { Allowance, Bill } from '@shared/types';

const ONUR = 1;
const MAHMUT = 2;

const allowance = (over: Partial<Allowance>): Allowance => ({
  id: Math.floor(Math.random() * 1e6),
  person_id: ONUR,
  amount: 1000,
  date: '2026-05-05',
  note: null,
  ...over,
});

const bill = (over: Partial<Bill>): Bill => ({
  id: Math.floor(Math.random() * 1e6),
  status: 'Ödendi',
  name: 'Telefon',
  bill_type: 'Turkcell',
  amount: 2000,
  due_date: '2026-05-20',
  paid_date: '2026-05-19',
  paid_for_person_id: ONUR,
  account_no: null,
  note: null,
  recurring: 0,
  recurring_parent_id: null,
  ...over,
});

describe('computePersonAllowance', () => {
  it('returns zeros when no records exist', () => {
    const r = computePersonAllowance(ONUR, 2026, 5, [], []);
    expect(r).toEqual({ cash: 0, bills: 0, total: 0 });
  });

  it('sums only cash allowances when there are no personal bills', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [allowance({ amount: 1000 }), allowance({ amount: 500 })],
      [],
    );
    expect(r).toEqual({ cash: 1500, bills: 0, total: 1500 });
  });

  it('sums only personal bills when there is no cash allowance', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [],
      [bill({ amount: 2000 }), bill({ amount: 300 })],
    );
    expect(r).toEqual({ cash: 0, bills: 2300, total: 2300 });
  });

  it('matches the spec example: 1000₺ cash + 2000₺ phone bill → 3000₺', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [allowance({ amount: 1000 })],
      [bill({ amount: 2000 })],
    );
    expect(r).toEqual({ cash: 1000, bills: 2000, total: 3000 });
  });

  it('ignores entries from other persons', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [allowance({ person_id: MAHMUT, amount: 5000 })],
      [bill({ paid_for_person_id: MAHMUT, amount: 5000 })],
    );
    expect(r).toEqual({ cash: 0, bills: 0, total: 0 });
  });

  it('ignores entries from other months (boundary check)', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [
        allowance({ amount: 1000, date: '2026-04-30' }), // önceki ay
        allowance({ amount: 1000, date: '2026-06-01' }), // sonraki ay
        allowance({ amount: 1000, date: '2026-05-01' }), // ay başı
        allowance({ amount: 1000, date: '2026-05-31' }), // ay sonu
      ],
      [
        bill({ amount: 500, paid_date: '2026-04-30' }),
        bill({ amount: 500, paid_date: '2026-06-01' }),
        bill({ amount: 500, paid_date: '2026-05-15' }),
      ],
    );
    expect(r).toEqual({ cash: 2000, bills: 500, total: 2500 });
  });

  it('ignores unpaid bills (status != "Ödendi")', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [],
      [
        bill({ status: 'Bekliyor', amount: 2000 }),
        bill({ status: 'Gecikti', amount: 1500 }),
        bill({ status: 'Ödendi', amount: 800 }),
      ],
    );
    expect(r).toEqual({ cash: 0, bills: 800, total: 800 });
  });

  it('ignores paid bills with paid_date in different month', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      5,
      [],
      [bill({ status: 'Ödendi', amount: 2000, paid_date: '2026-04-28' })],
    );
    expect(r.bills).toBe(0);
  });

  it('handles January boundary (year boundary check via prevMonth path elsewhere)', () => {
    const r = computePersonAllowance(
      ONUR,
      2026,
      1,
      [allowance({ amount: 1000, date: '2026-01-15' })],
      [bill({ amount: 800, paid_date: '2026-01-20' })],
    );
    expect(r.total).toBe(1800);
  });
});
