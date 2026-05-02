import { describe, expect, it } from 'vitest';
import { debtSchema, debtPaymentSchema, personSchema } from '@renderer/lib/validators';

describe('debtSchema', () => {
  it('accepts valid debt input', () => {
    const r = debtSchema.safeParse({
      name: 'Buzdolabı',
      total_amount: 24000,
      remaining_amount: 16000,
      due_date: '2026-12-15',
      note: '12 taksit',
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative total amount', () => {
    const r = debtSchema.safeParse({
      name: 'X',
      total_amount: -1,
      remaining_amount: 0,
      due_date: null,
      note: null,
    });
    expect(r.success).toBe(false);
  });

  it('rejects when remaining > total', () => {
    const r = debtSchema.safeParse({
      name: 'X',
      total_amount: 1000,
      remaining_amount: 2000,
      due_date: null,
      note: null,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('remaining_amount'))).toBe(true);
    }
  });

  it('allows remaining = 0 (fully paid)', () => {
    const r = debtSchema.safeParse({
      name: 'X',
      total_amount: 1000,
      remaining_amount: 0,
      due_date: null,
      note: null,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = debtSchema.safeParse({
      name: '',
      total_amount: 1000,
      remaining_amount: 500,
      due_date: null,
      note: null,
    });
    expect(r.success).toBe(false);
  });

  it('accepts null due_date and note', () => {
    const r = debtSchema.safeParse({
      name: 'X',
      total_amount: 100,
      remaining_amount: 50,
    });
    expect(r.success).toBe(true);
  });
});

describe('debtPaymentSchema', () => {
  it('accepts valid payment', () => {
    const r = debtPaymentSchema.safeParse({ amount: 500, payment_date: '2026-05-15' });
    expect(r.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const r = debtPaymentSchema.safeParse({ amount: 0, payment_date: '2026-05-15' });
    expect(r.success).toBe(false);
  });

  it('rejects malformed date', () => {
    const r = debtPaymentSchema.safeParse({ amount: 100, payment_date: '15.05.2026' });
    expect(r.success).toBe(false);
  });
});

describe('personSchema', () => {
  it('accepts valid person', () => {
    const r = personSchema.safeParse({ name: 'ONUR', is_active: 1 });
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = personSchema.safeParse({ name: '', is_active: 1 });
    expect(r.success).toBe(false);
  });

  it('rejects name longer than 50 chars', () => {
    const r = personSchema.safeParse({ name: 'A'.repeat(51), is_active: 1 });
    expect(r.success).toBe(false);
  });

  it('coerces string is_active values', () => {
    const r = personSchema.safeParse({ name: 'ONUR', is_active: '1' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.is_active).toBe(1);
  });
});
