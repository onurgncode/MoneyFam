import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Debt } from '@shared/types';
import { debtSchema, type DebtFormValues } from '@renderer/lib/validators';
import { toast } from '@renderer/stores/toastStore';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input, Textarea } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Debt | null;
  onSaved: () => void;
}

export function DebtFormDialog({ open, onOpenChange, editing, onSaved }: Props): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: defaultValues(editing),
  });

  useEffect(() => {
    if (open) reset(defaultValues(editing));
  }, [open, editing, reset]);

  async function onSubmit(values: DebtFormValues): Promise<void> {
    const res = editing
      ? await window.api.debts.update(editing.id, values)
      : await window.api.debts.create(values);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', editing ? 'Borç güncellendi' : 'Borç eklendi');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Borcu Düzenle' : 'Yeni Borç'}</DialogTitle>
        <DialogDescription>
          Kredi, taksit veya bir kişiye olan borcu kaydedin. Ödeme yapıldıkça kalan tutar düşecektir.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Borç Adı</Label>
          <Input id="name" {...register('name')} placeholder="Buzdolabı taksiti" />
          {errors.name ? <ErrorText>{errors.name.message}</ErrorText> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="total_amount">Toplam Tutar (₺)</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              min="0"
              {...register('total_amount', { valueAsNumber: true })}
            />
            {errors.total_amount ? <ErrorText>{errors.total_amount.message}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="remaining_amount">Kalan Tutar (₺)</Label>
            <Input
              id="remaining_amount"
              type="number"
              step="0.01"
              min="0"
              {...register('remaining_amount', { valueAsNumber: true })}
            />
            {errors.remaining_amount ? <ErrorText>{errors.remaining_amount.message}</ErrorText> : null}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="due_date">Son Ödeme Tarihi (opsiyonel)</Label>
          <Input id="due_date" type="date" {...register('due_date')} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="note">Not</Label>
          <Textarea id="note" rows={2} {...register('note')} placeholder="12 taksit, %0 faiz…" />
        </div>
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

function defaultValues(editing: Debt | null): DebtFormValues {
  if (editing) {
    return {
      name: editing.name,
      total_amount: editing.total_amount,
      remaining_amount: editing.remaining_amount,
      due_date: editing.due_date,
      note: editing.note,
    };
  }
  return {
    name: '',
    total_amount: 0,
    remaining_amount: 0,
    due_date: null,
    note: null,
  };
}
