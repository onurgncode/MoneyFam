import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Expense } from '@shared/types';
import { expenseSchema, type ExpenseFormValues, CATEGORY_OPTIONS } from '@renderer/lib/validators';
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
  editing: Expense | null;
  onSaved: () => void;
}

export function ExpenseFormDialog({ open, onOpenChange, editing, onSaved }: Props): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaultValues(editing),
  });

  useEffect(() => {
    if (open) reset(defaultValues(editing));
  }, [open, editing, reset]);

  async function onSubmit(values: ExpenseFormValues): Promise<void> {
    const res = editing
      ? await window.api.expenses.update(editing.id, values)
      : await window.api.expenses.create(values);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', editing ? 'Harcama güncellendi' : 'Harcama eklendi');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Harcamayı Düzenle' : 'Yeni Harcama'}</DialogTitle>
        <DialogDescription>Detaylı harcama kaydı.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="item_name">Ürün adı</Label>
            <Input id="item_name" {...register('item_name')} />
            {errors.item_name ? <ErrorText>{errors.item_name.message}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="quantity">Miktar</Label>
            <Input id="quantity" placeholder="3 kg, 2 lt" {...register('quantity')} />
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
            <Label htmlFor="category">Kategori</Label>
            <Select id="category" {...register('category')}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="date">Tarih</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date ? <ErrorText>{errors.date.message}</ErrorText> : null}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="note">Not</Label>
          <Textarea id="note" rows={2} {...register('note')} />
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

function defaultValues(editing: Expense | null): ExpenseFormValues {
  if (editing) {
    return {
      item_name: editing.item_name,
      quantity: editing.quantity,
      amount: editing.amount,
      category: editing.category as ExpenseFormValues['category'],
      date: editing.date,
      note: editing.note,
    };
  }
  return {
    item_name: '',
    quantity: null,
    amount: 0,
    category: 'Yemek',
    date: todayIso(),
    note: null,
  };
}
