import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Person } from '@shared/types';
import { personSchema, type PersonFormValues } from '@renderer/lib/validators';
import { toast } from '@renderer/stores/toastStore';
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Person | null;
  onSaved: () => void;
}

export function PersonFormDialog({ open, onOpenChange, editing, onSaved }: Props): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: defaultValues(editing),
  });

  useEffect(() => {
    if (open) reset(defaultValues(editing));
  }, [open, editing, reset]);

  async function onSubmit(values: PersonFormValues): Promise<void> {
    const res = editing
      ? await window.api.persons.update(editing.id, values)
      : await window.api.persons.create(values);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', editing ? 'Kişi güncellendi' : 'Kişi eklendi');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Kişiyi Düzenle' : 'Yeni Kişi'}</DialogTitle>
        <DialogDescription>Hane içindeki bir kişiyi ekleyin veya düzenleyin.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">İsim</Label>
          <Input id="name" {...register('name')} placeholder="ONUR, MAHMUT…" />
          {errors.name ? <ErrorText>{errors.name.message}</ErrorText> : null}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="is_active">Durum</Label>
          <Select id="is_active" {...register('is_active')}>
            <option value="1">Aktif</option>
            <option value="0">Pasif</option>
          </Select>
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

function defaultValues(editing: Person | null): PersonFormValues {
  if (editing) return { name: editing.name, is_active: editing.is_active };
  return { name: '', is_active: 1 };
}
