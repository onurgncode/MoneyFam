import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Income } from '@shared/types';
import { incomeSchema, type IncomeFormValues, SOURCE_OPTIONS } from '@renderer/lib/validators';
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
import { Input } from '@renderer/components/ui/input';
import { Select } from '@renderer/components/ui/select';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/input';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Income | null;
  onSaved: () => void;
}

export function IncomeFormDialog({ open, onOpenChange, editing, onSaved }: Props): React.ReactElement {
  const persons = usePersonsStore((s) => s.items);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: defaultValues(editing, persons[0]?.id),
  });

  useEffect(() => {
    if (open) reset(defaultValues(editing, persons[0]?.id));
  }, [open, editing, persons, reset]);

  async function onSubmit(values: IncomeFormValues): Promise<void> {
    const res = editing
      ? await window.api.income.update(editing.id, values)
      : await window.api.income.create(values);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', editing ? 'Gelir güncellendi' : 'Gelir eklendi');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Geliri Düzenle' : 'Yeni Gelir'}</DialogTitle>
        <DialogDescription>Maaş, ek gelir veya diğer gelirleri kaydedin.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="person_id">Kişi</Label>
            <Select id="person_id" {...register('person_id')}>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {errors.person_id ? <ErrorText>{errors.person_id.message}</ErrorText> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="source">Kaynak</Label>
            <Select id="source" {...register('source')}>
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {errors.source ? <ErrorText>{errors.source.message}</ErrorText> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
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

function defaultValues(editing: Income | null, fallbackPersonId?: number): IncomeFormValues {
  if (editing) {
    return {
      person_id: editing.person_id,
      source: editing.source,
      amount: editing.amount,
      date: editing.date,
      note: editing.note,
    };
  }
  return {
    person_id: fallbackPersonId ?? 0,
    source: 'MAAŞ',
    amount: 0,
    date: todayIso(),
    note: null,
  };
}
