import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import type { Debt, DebtPayment } from '@shared/types';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Badge } from '@renderer/components/ui/badge';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { debtPaymentSchema, type DebtPaymentFormValues } from '@renderer/lib/validators';
import { toast } from '@renderer/stores/toastStore';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR, todayIso } from '@renderer/lib/date';
import { cn } from '@renderer/lib/cn';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  debt: Debt | null;
  onChanged: () => void;
}

export function DebtDetailDialog({ open, onOpenChange, debt, onChanged }: Props): React.ReactElement {
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<DebtPayment | null>(null);
  const [currentDebt, setCurrentDebt] = useState<Debt | null>(debt);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DebtPaymentFormValues>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: { amount: 0, payment_date: todayIso() },
  });

  useEffect(() => {
    setCurrentDebt(debt);
  }, [debt]);

  async function loadPayments(): Promise<void> {
    if (!debt) return;
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      window.api.debts.paymentsList(debt.id),
      window.api.debts.list(),
    ]);
    if (!pRes.ok || !dRes.ok) {
      toast('error', 'Borç detayları yüklenemedi');
      setLoading(false);
      return;
    }
    setPayments(pRes.data);
    setCurrentDebt(dRes.data.find((x) => x.id === debt.id) ?? debt);
    setLoading(false);
  }

  useEffect(() => {
    if (open && debt) {
      loadPayments();
      reset({ amount: 0, payment_date: todayIso() });
    }
  }, [open, debt, reset]);

  async function handleAdd(values: DebtPaymentFormValues): Promise<void> {
    if (!debt) return;
    const res = await window.api.debts.paymentCreate({
      debt_id: debt.id,
      amount: values.amount,
      payment_date: values.payment_date,
    });
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Ödeme eklendi');
    reset({ amount: 0, payment_date: todayIso() });
    await loadPayments();
    onChanged();
  }

  async function handleDeletePayment(): Promise<void> {
    if (!deleting) return;
    const res = await window.api.debts.paymentRemove(deleting.id);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Ödeme silindi');
    setDeleting(null);
    await loadPayments();
    onChanged();
  }

  if (!debt || !currentDebt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <div />
      </Dialog>
    );
  }

  const paid = currentDebt.total_amount - currentDebt.remaining_amount;
  const pct = currentDebt.total_amount > 0 ? (paid / currentDebt.total_amount) * 100 : 0;
  const closed = currentDebt.remaining_amount <= 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentDebt.name}
            {closed ? <Badge tone="success">Kapandı</Badge> : null}
          </DialogTitle>
          <DialogDescription>
            {currentDebt.note ?? 'Ödeme geçmişi ve yeni ödeme ekleme.'}
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3">
          <div>
            <div className="text-xs text-muted-foreground">Toplam</div>
            <div className="font-semibold tabular-nums">{formatTRY(currentDebt.total_amount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ödenen</div>
            <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatTRY(paid)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Kalan</div>
            <div className="font-semibold tabular-nums text-red-600 dark:text-red-400">
              {formatTRY(currentDebt.remaining_amount)}
            </div>
          </div>
          <div className="col-span-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all',
                  pct >= 100 ? 'bg-emerald-500' : 'bg-primary',
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
              %{pct.toFixed(1)} tamamlandı
              {currentDebt.due_date ? ` • Son ödeme ${formatDateTR(currentDebt.due_date)}` : ''}
            </div>
          </div>
        </div>

        {/* Add payment */}
        {!closed ? (
          <form
            onSubmit={handleSubmit(handleAdd)}
            className="mb-4 flex items-end gap-2 rounded-md border bg-card p-3"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="amount">
                Tutar (₺)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount ? (
                <span className="text-xs text-destructive">{errors.amount.message}</span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="payment_date">
                Tarih
              </label>
              <Input id="payment_date" type="date" {...register('payment_date')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" /> Ödeme Ekle
            </Button>
          </form>
        ) : null}

        {/* Payment history */}
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Ödeme Geçmişi ({payments.length})
        </div>
        <div className="max-h-[260px] overflow-y-auto rounded-md border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Yükleniyor…</div>
          ) : payments.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Henüz ödeme yok.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {formatDateTR(p.payment_date)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatTRY(p.amount)}
                    </td>
                    <td className="w-12 px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(p)}
                        aria-label="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Ödemeyi sil"
        description={
          deleting
            ? `${formatTRY(deleting.amount)} tutarındaki ödeme silinecek ve borcun kalan tutarı geri eklenecek.`
            : ''
        }
        destructive
        confirmLabel="Sil"
        onConfirm={handleDeletePayment}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
