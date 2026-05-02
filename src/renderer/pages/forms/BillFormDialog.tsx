import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Bill } from '@shared/types';
import { billSchema, type BillFormValues, STATUS_OPTIONS, TYPE_OPTIONS } from '@renderer/lib/validators';
import { usePersonsStore } from '@renderer/stores/personsStore';
import { toast } from '@renderer/stores/toastStore';
import { todayIso } from '@renderer/lib/date';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input, Textarea } from '@renderer/components/ui/input';
import { Select } from '@renderer/components/ui/select';
import { Label } from '@renderer/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Bill | null;
  onSaved: () => void;
}

export function BillFormDialog({ open, onOpenChange, editing, onSaved }: Props): React.ReactElement {
  const persons = usePersonsStore((s) => s.items);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: defaultValues(editing),
  });

  useEffect(() => {
    if (open) reset(defaultValues(editing));
  }, [open, editing, reset]);

  const status = watch('status');

  async function onSubmit(values: BillFormValues): Promise<void> {
    // status='Ödendi' ama paid_date yoksa bugünü kullan
    if (values.status === 'Ödendi' && !values.paid_date) {
      values.paid_date = todayIso();
    }
    if (values.status !== 'Ödendi') {
      values.paid_date = null;
    }
    const res = editing
      ? await window.api.bills.update(editing.id, values)
      : await window.api.bills.create(values);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', editing ? 'Fatura güncellendi' : 'Fatura eklendi');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Faturayı Düzenle' : 'Yeni Fatura'}</DialogTitle>
        <DialogDescription>Ev faturası veya bir kişiye ait fatura ekleyin.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name">Fatura Adı</Label>
            <Input id="name" {...register('name')} placeholder="Elektrik faturası" />
            {errors.name ? <ErrorText>{errors.name.message}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="bill_type">Tür</Label>
            <Select id="bill_type" {...register('bill_type')}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="amount">Tutar (₺)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount ? <ErrorText>{errors.amount.message}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="due_date">Son Ödeme</Label>
            <Input id="due_date" type="date" {...register('due_date')} />
            {errors.due_date ? <ErrorText>{errors.due_date.message}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="status">Durum</Label>
            <Select id="status" {...register('status')}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {status === 'Ödendi' ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor="paid_date">Ödenme Tarihi</Label>
            <Input id="paid_date" type="date" {...register('paid_date')} />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="paid_for_person_id">Kim için?</Label>
            <Controller
              control={control}
              name="paid_for_person_id"
              render={({ field }) => (
                <Select
                  id="paid_for_person_id"
                  value={field.value == null ? '' : String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">Ev (paylaşımlı)</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="account_no">Abone No</Label>
            <Input id="account_no" {...register('account_no')} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="note">Not</Label>
          <Textarea id="note" rows={2} {...register('note')} />
        </div>
        <label className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register('recurring', { setValueAs: (v) => (v ? 1 : 0) })}
          />
          <div>
            <div className="font-medium">Bu faturayı her ay otomatik oluştur</div>
            <div className="text-xs text-muted-foreground">
              Her ayın aynı gününde, "Bekliyor" durumunda yeni bir fatura oluşturulur.
            </div>
          </div>
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {editing ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function ErrorText({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="text-xs text-destructive">{children}</span>;
}

function defaultValues(editing: Bill | null): BillFormValues {
  if (editing) {
    return {
      status: editing.status,
      name: editing.name,
      bill_type: editing.bill_type,
      amount: editing.amount,
      due_date: editing.due_date,
      paid_date: editing.paid_date,
      paid_for_person_id: editing.paid_for_person_id,
      account_no: editing.account_no,
      note: editing.note,
      recurring: editing.recurring,
      recurring_parent_id: editing.recurring_parent_id,
    };
  }
  return {
    status: 'Bekliyor',
    name: '',
    bill_type: 'Elektrik',
    amount: 0,
    due_date: todayIso(),
    paid_date: null,
    paid_for_person_id: null,
    account_no: null,
    note: null,
    recurring: 0,
    recurring_parent_id: null,
  };
}
