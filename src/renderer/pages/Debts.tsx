import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Archive, RotateCcw, ChevronRight, AlertCircle } from 'lucide-react';
import type { Debt, DebtSummary } from '@shared/types';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { DebtFormDialog } from '@renderer/pages/forms/DebtFormDialog';
import { DebtDetailDialog } from '@renderer/pages/forms/DebtDetailDialog';
import { toast } from '@renderer/stores/toastStore';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR } from '@renderer/lib/date';
import { cn } from '@renderer/lib/cn';

interface Props {
  newRequestKey: number;
}

export function Debts({ newRequestKey }: Props): React.ReactElement {
  const [active, setActive] = useState<Debt[]>([]);
  const [archived, setArchived] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [detailing, setDetailing] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    const [aRes, arcRes, sRes] = await Promise.all([
      window.api.debts.list({ is_active: 1 }),
      window.api.debts.list({ is_active: 0 }),
      window.api.debts.summary(),
    ]);
    if (!aRes.ok || !arcRes.ok || !sRes.ok) {
      toast('error', 'Borçlar yüklenemedi');
      setLoading(false);
      return;
    }
    setActive(aRes.data);
    setArchived(arcRes.data);
    setSummary(sRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (newRequestKey > 0) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [newRequestKey]);

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    const res = await window.api.debts.remove(deleting.id);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Borç silindi');
    setDeleting(null);
    load();
  }

  async function handleArchive(d: Debt, archive: boolean): Promise<void> {
    const res = await window.api.debts.setActive(d.id, !archive);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', archive ? 'Borç arşivlendi' : 'Borç tekrar aktif');
    load();
  }

  const items = view === 'active' ? active : archived;

  return (
    <div className="flex flex-col gap-4">
      {summary ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Aktif Borç</div>
              <div className="text-xl font-bold tabular-nums">{formatTRY(summary.total)}</div>
              <div className="text-xs text-muted-foreground">{summary.activeCount} kayıt</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Ödenen</div>
              <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatTRY(summary.paid)}
              </div>
              <div className="text-xs text-muted-foreground">aktif borçlardan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Kalan</div>
              <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatTRY(summary.remaining)}
              </div>
              <div className="text-xs text-muted-foreground">aktif borçlardan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Tamamlanma</div>
              <div className="text-xl font-bold tabular-nums">
                {summary.total > 0 ? `${Math.round((summary.paid / summary.total) * 100)}%` : '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                {archived.length} arşivlenmiş borç
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <button
            onClick={() => setView('active')}
            className={cn(
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              view === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            Aktif ({active.length})
          </button>
          <button
            onClick={() => setView('archived')}
            className={cn(
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              view === 'archived' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            Arşiv ({archived.length})
          </button>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Yeni Borç
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={
            view === 'active'
              ? 'Aktif borcunuz yok'
              : 'Arşivlenmiş borç yok'
          }
          description={
            view === 'active'
              ? 'Taksit, kredi veya ödenecek bir tutar eklemek için yukarıdaki butonu kullanın.'
              : 'Tamamen ödenen borçlar otomatik olarak buraya taşınır.'
          }
          actionLabel={view === 'active' ? 'Yeni Borç Ekle' : undefined}
          onAction={
            view === 'active'
              ? () => {
                  setEditing(null);
                  setFormOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Borç</th>
                  <th className="px-3 py-2 text-right font-medium">Toplam</th>
                  <th className="px-3 py-2 text-right font-medium">Ödenen</th>
                  <th className="px-3 py-2 text-right font-medium">Kalan</th>
                  <th className="px-3 py-2 text-left font-medium">İlerleme</th>
                  <th className="px-3 py-2 text-left font-medium">Son Ödeme</th>
                  <th className="w-32 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((d) => {
                  const paid = d.total_amount - d.remaining_amount;
                  const pct = d.total_amount > 0 ? (paid / d.total_amount) * 100 : 0;
                  const overdue =
                    view === 'active' && d.due_date != null && d.due_date < todayIsoLocal();
                  return (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setDetailing(d)}
                          className="flex items-center gap-1 font-medium hover:text-primary"
                        >
                          {overdue ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> : null}
                          {d.name}
                          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                        </button>
                        {d.note ? (
                          <div className="text-xs text-muted-foreground">{d.note}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatTRY(d.total_amount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatTRY(paid)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatTRY(d.remaining_amount)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full transition-all',
                                pct >= 100 ? 'bg-emerald-500' : 'bg-primary',
                              )}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {d.due_date ? formatDateTR(d.due_date) : '—'}
                        {overdue ? (
                          <Badge tone="danger" className="ml-2">
                            Gecikti
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(d);
                              setFormOpen(true);
                            }}
                            aria-label="Düzenle"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchive(d, view === 'active')}
                            aria-label={view === 'active' ? 'Arşivle' : 'Aktif et'}
                            title={view === 'active' ? 'Arşivle' : 'Aktif et'}
                          >
                            {view === 'active' ? (
                              <Archive className="h-3.5 w-3.5" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(d)}
                            aria-label="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <DebtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      <DebtDetailDialog
        open={detailing != null}
        onOpenChange={(v) => !v && setDetailing(null)}
        debt={detailing}
        onChanged={load}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Borcu sil"
        description={
          deleting
            ? `"${deleting.name}" borcu ve tüm ödeme geçmişi silinecek. Bu işlem geri alınamaz.`
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

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
