import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Income as IncomeRow } from '@shared/types';
import { useMonthStore } from '@renderer/stores/monthStore';
import { usePersonsStore } from '@renderer/stores/personsStore';
import { toast } from '@renderer/stores/toastStore';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { IncomeFormDialog } from '@renderer/pages/forms/IncomeFormDialog';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR, formatMonthLabel } from '@renderer/lib/date';

interface Props {
  newRequestKey: number;
}

export function Income({ newRequestKey }: Props): React.ReactElement {
  const { year, month } = useMonthStore();
  const persons = usePersonsStore((s) => s.items);
  const [items, setItems] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRow | null>(null);
  const [deleting, setDeleting] = useState<IncomeRow | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    const res = await window.api.income.list({ year, month });
    if (!res.ok) {
      toast('error', `Yüklenemedi: ${res.error}`);
      setLoading(false);
      return;
    }
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [year, month]);

  useEffect(() => {
    if (newRequestKey > 0) {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [newRequestKey]);

  const personName = (id: number): string => persons.find((p) => p.id === id)?.name ?? '—';

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    const res = await window.api.income.remove(deleting.id);
    if (!res.ok) {
      toast('error', `Silinemedi: ${res.error}`);
      return;
    }
    toast('success', 'Gelir silindi');
    setDeleting(null);
    load();
  }

  const total = items.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {formatMonthLabel(year, month)} • {items.length} kayıt • Toplam{' '}
          <span className="font-semibold text-foreground">{formatTRY(total)}</span>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Yeni Gelir
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Bu ay için gelir kaydı yok"
          description="Maaş veya ek gelir eklemek için yukarıdaki butonu kullanın."
          actionLabel="Yeni Gelir Ekle"
          onAction={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Tarih</th>
                  <th className="px-4 py-2 text-left font-medium">Kişi</th>
                  <th className="px-4 py-2 text-left font-medium">Kaynak</th>
                  <th className="px-4 py-2 text-right font-medium">Tutar</th>
                  <th className="px-4 py-2 text-left font-medium">Not</th>
                  <th className="w-20 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 tabular-nums">{formatDateTR(r.date)}</td>
                    <td className="px-4 py-2">{personName(r.person_id)}</td>
                    <td className="px-4 py-2">
                      <Badge tone="muted">{r.source}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatTRY(r.amount)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.note ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(r)}
                          aria-label="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <IncomeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Gelir kaydını sil"
        description={
          deleting
            ? `${formatTRY(deleting.amount)} tutarındaki kayıt silinecek. Bu işlem geri alınamaz.`
            : ''
        }
        destructive
        confirmLabel="Sil"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
