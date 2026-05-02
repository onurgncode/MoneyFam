import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Expense } from '@shared/types';
import { CATEGORY_COLORS, EXPENSE_CATEGORIES } from '@shared/constants';
import { useMonthStore } from '@renderer/stores/monthStore';
import { toast } from '@renderer/stores/toastStore';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Select } from '@renderer/components/ui/select';
import { Badge } from '@renderer/components/ui/badge';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { ExpenseFormDialog } from '@renderer/pages/forms/ExpenseFormDialog';
import { expenseSchema, type ExpenseFormValues } from '@renderer/lib/validators';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR, formatMonthLabel, todayIso } from '@renderer/lib/date';

interface Props {
  newRequestKey: number;
}

export function Expenses({ newRequestKey }: Props): React.ReactElement {
  const { year, month } = useMonthStore();
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const inlineForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      item_name: '',
      quantity: null,
      amount: 0,
      category: 'Yemek',
      date: todayIso(),
      note: null,
    },
  });

  async function load(): Promise<void> {
    setLoading(true);
    const res = await window.api.expenses.list({
      year,
      month,
      category: categoryFilter || undefined,
    });
    if (!res.ok) {
      toast('error', res.error);
      setLoading(false);
      return;
    }
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [year, month, categoryFilter]);

  useEffect(() => {
    if (newRequestKey > 0) {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [newRequestKey]);

  async function handleInlineSubmit(values: ExpenseFormValues): Promise<void> {
    const res = await window.api.expenses.create(values);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Harcama eklendi');
    inlineForm.reset({
      item_name: '',
      quantity: null,
      amount: 0,
      category: values.category,
      date: values.date,
      note: null,
    });
    load();
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    const res = await window.api.expenses.remove(deleting.id);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Harcama silindi');
    setDeleting(null);
    load();
  }

  const stats = useMemo(() => {
    const total = items.reduce((s, e) => s + e.amount, 0);
    const days = new Set(items.map((e) => e.date)).size || 1;
    const dailyAvg = total / days;
    const byCat = new Map<string, number>();
    for (const e of items) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    let topCat = '—';
    let topCatVal = 0;
    for (const [k, v] of byCat) {
      if (v > topCatVal) {
        topCat = k;
        topCatVal = v;
      }
    }
    return { total, dailyAvg, topCat, topCatVal };
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Toplam Harcama</div>
            <div className="text-xl font-bold tabular-nums">{formatTRY(stats.total)}</div>
            <div className="text-xs text-muted-foreground">{formatMonthLabel(year, month)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Günlük Ortalama</div>
            <div className="text-xl font-bold tabular-nums">{formatTRY(stats.dailyAvg)}</div>
            <div className="text-xs text-muted-foreground">harcama yapılan günlere göre</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">En Yüksek Kategori</div>
            <div className="text-xl font-bold">{stats.topCat}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {formatTRY(stats.topCatVal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inline quick-add form */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={inlineForm.handleSubmit(handleInlineSubmit)}
            className="grid grid-cols-12 items-end gap-2"
          >
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs text-muted-foreground">Ürün adı</label>
              <Input
                placeholder="Ekmek, et, otobüs kart…"
                {...inlineForm.register('item_name')}
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-muted-foreground">Miktar</label>
              <Input placeholder="3 kg" {...inlineForm.register('quantity')} />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-muted-foreground">Tutar (₺)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...inlineForm.register('amount', { valueAsNumber: true })}
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-muted-foreground">Kategori</label>
              <Select {...inlineForm.register('category')}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-8 md:col-span-2">
              <label className="text-xs text-muted-foreground">Tarih</label>
              <Input type="date" {...inlineForm.register('date')} />
            </div>
            <div className="col-span-4 md:col-span-1">
              <Button type="submit" className="w-full" disabled={inlineForm.formState.isSubmitting}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>
          {inlineForm.formState.errors.item_name ? (
            <div className="mt-1 text-xs text-destructive">
              {inlineForm.formState.errors.item_name.message}
            </div>
          ) : null}
          {inlineForm.formState.errors.amount ? (
            <div className="mt-1 text-xs text-destructive">
              {inlineForm.formState.errors.amount.message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">Tüm kategoriler</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Detaylı Ekle
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Bu ay için harcama kaydı yok"
          description="Yukarıdaki hızlı ekleme formundan harcamalarınızı girebilirsiniz."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tarih</th>
                  <th className="px-3 py-2 text-left font-medium">Ürün</th>
                  <th className="px-3 py-2 text-left font-medium">Miktar</th>
                  <th className="px-3 py-2 text-left font-medium">Kategori</th>
                  <th className="px-3 py-2 text-right font-medium">Tutar</th>
                  <th className="w-20 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums">{formatDateTR(e.date)}</td>
                    <td className="px-3 py-2 font-medium">{e.item_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.quantity ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge
                        tone="default"
                        style={{
                          backgroundColor:
                            (CATEGORY_COLORS[e.category as keyof typeof CATEGORY_COLORS] ?? '#6b7280') +
                            '20',
                          color:
                            CATEGORY_COLORS[e.category as keyof typeof CATEGORY_COLORS] ?? '#6b7280',
                          borderColor: 'transparent',
                        }}
                      >
                        {e.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatTRY(e.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(e);
                            setDialogOpen(true);
                          }}
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(e)}
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

      <ExpenseFormDialog
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
        title="Harcamayı sil"
        description={
          deleting ? `"${deleting.item_name}" (${formatTRY(deleting.amount)}) silinecek.` : ''
        }
        destructive
        confirmLabel="Sil"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
