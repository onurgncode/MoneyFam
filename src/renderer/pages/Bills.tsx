import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Repeat } from 'lucide-react';
import type { Bill } from '@shared/types';
import { BILL_STATUSES, BILL_TYPES, type BillStatus } from '@shared/constants';
import { useMonthStore } from '@renderer/stores/monthStore';
import { usePersonsStore } from '@renderer/stores/personsStore';
import { toast } from '@renderer/stores/toastStore';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { Select } from '@renderer/components/ui/select';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { BillFormDialog } from '@renderer/pages/forms/BillFormDialog';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR, formatMonthLabel } from '@renderer/lib/date';

const STATUS_TONES: Record<BillStatus, 'success' | 'warning' | 'danger'> = {
  Ödendi: 'success',
  Bekliyor: 'warning',
  Gecikti: 'danger',
};

interface Props {
  newRequestKey: number;
}

export function Bills({ newRequestKey }: Props): React.ReactElement {
  const { year, month } = useMonthStore();
  const persons = usePersonsStore((s) => s.items);
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'' | BillStatus>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [personFilter, setPersonFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    const filter: Parameters<typeof window.api.bills.list>[0] = { year, month };
    if (statusFilter) filter.status = statusFilter;
    if (typeFilter) filter.bill_type = typeFilter;
    if (personFilter === 'house') filter.paid_for_person_id = null;
    else if (personFilter) filter.paid_for_person_id = Number(personFilter);
    const res = await window.api.bills.list(filter);
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
  }, [year, month, statusFilter, typeFilter, personFilter]);

  useEffect(() => {
    if (newRequestKey > 0) {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [newRequestKey]);

  async function cycleStatus(b: Bill): Promise<void> {
    const res = await window.api.bills.toggleStatus(b.id);
    if (!res.ok) toast('error', res.error);
    else load();
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    const res = await window.api.bills.remove(deleting.id);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Fatura silindi');
    setDeleting(null);
    load();
  }

  const personName = (id: number | null): string =>
    id == null ? 'Ev' : persons.find((p) => p.id === id)?.name ?? '—';

  const totals = useMemo(() => {
    const paid = items
      .filter((b) => b.status === 'Ödendi')
      .reduce((s, b) => s + b.amount, 0);
    const pending = items
      .filter((b) => b.status !== 'Ödendi')
      .reduce((s, b) => s + b.amount, 0);
    return { paid, pending };
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {formatMonthLabel(year, month)} • Ödendi {formatTRY(totals.paid)} • Bekleyen{' '}
          {formatTRY(totals.pending)}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Yeni Fatura
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BillStatus | '')}
            className="max-w-[160px]"
          >
            <option value="">Tüm durumlar</option>
            {BILL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">Tüm türler</option>
            {BILL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">Tüm kişiler</option>
            <option value="house">Ev (paylaşımlı)</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {(statusFilter || typeFilter || personFilter) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setPersonFilter('');
              }}
            >
              Filtreleri Temizle
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Bu ay için fatura yok"
          description="Yeni fatura eklemek için yukarıdaki butonu kullanın."
          actionLabel="Yeni Fatura Ekle"
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
                  <th className="px-3 py-2 text-left font-medium">Durum</th>
                  <th className="px-3 py-2 text-left font-medium">Fatura</th>
                  <th className="px-3 py-2 text-left font-medium">Tür</th>
                  <th className="px-3 py-2 text-right font-medium">Tutar</th>
                  <th className="px-3 py-2 text-left font-medium">Son Ödeme</th>
                  <th className="px-3 py-2 text-left font-medium">Ödenme</th>
                  <th className="px-3 py-2 text-left font-medium">Kim için</th>
                  <th className="px-3 py-2 text-left font-medium">Abone No</th>
                  <th className="w-20 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <button onClick={() => cycleStatus(b)} title="Tıklayın: durum değiştir">
                        <Badge tone={STATUS_TONES[b.status]}>{b.status}</Badge>
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {b.name}
                        {b.recurring ? (
                          <span title="Her ay otomatik oluşturulur" aria-label="Tekrar eden fatura">
                            <Repeat className="h-3 w-3 text-blue-500" />
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{b.bill_type}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatTRY(b.amount)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatDateTR(b.due_date)}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {b.paid_date ? formatDateTR(b.paid_date) : '—'}
                    </td>
                    <td className="px-3 py-2">{personName(b.paid_for_person_id)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.account_no ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(b);
                            setDialogOpen(true);
                          }}
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(b)}
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

      <BillFormDialog
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
        title="Faturayı sil"
        description={
          deleting
            ? `"${deleting.name}" (${formatTRY(deleting.amount)}) faturası silinecek. Bu işlem geri alınamaz.`
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
