import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import type { Allowance, Bill, Person } from '@shared/types';
import { useMonthStore } from '@renderer/stores/monthStore';
import { usePersonsStore } from '@renderer/stores/personsStore';
import { toast } from '@renderer/stores/toastStore';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { PersonFormDialog } from '@renderer/pages/forms/PersonFormDialog';
import { AllowanceFormDialog } from '@renderer/pages/forms/AllowanceFormDialog';
import { computePersonAllowance } from '@renderer/lib/calc/allowance';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR, formatMonthLabel } from '@renderer/lib/date';
import { cn } from '@renderer/lib/cn';

interface Props {
  newRequestKey: number;
}

export function People({ newRequestKey }: Props): React.ReactElement {
  const persons = usePersonsStore((s) => s.items);
  const reloadPersons = usePersonsStore((s) => s.load);
  const { year, month } = useMonthStore();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [allowanceFormOpen, setAllowanceFormOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [deletingAllowance, setDeletingAllowance] = useState<Allowance | null>(null);

  async function loadDetails(): Promise<void> {
    setLoading(true);
    const [aRes, bRes] = await Promise.all([
      window.api.allowances.list({ year, month }),
      window.api.bills.list({ year, month }),
    ]);
    if (!aRes.ok || !bRes.ok) {
      toast('error', 'Veriler yüklenemedi');
      setLoading(false);
      return;
    }
    setAllowances(aRes.data);
    setBills(bRes.data);
    setLoading(false);
  }

  useEffect(() => {
    loadDetails();
  }, [year, month]);

  useEffect(() => {
    if (persons.length > 0 && selectedId == null) setSelectedId(persons[0].id);
  }, [persons, selectedId]);

  useEffect(() => {
    if (newRequestKey > 0) {
      // Allowance ekleme yap (kişi seçiliyse)
      if (selectedId != null) {
        setEditingAllowance(null);
        setAllowanceFormOpen(true);
      } else {
        setEditingPerson(null);
        setPersonFormOpen(true);
      }
    }
  }, [newRequestKey, selectedId]);

  async function handleDeletePerson(): Promise<void> {
    if (!deletingPerson) return;
    const res = await window.api.persons.remove(deletingPerson.id);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Kişi silindi');
    setDeletingPerson(null);
    if (selectedId === deletingPerson.id) setSelectedId(null);
    reloadPersons();
  }

  async function togglePersonActive(p: Person): Promise<void> {
    const res = await window.api.persons.update(p.id, { is_active: p.is_active ? 0 : 1 });
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    reloadPersons();
  }

  async function handleDeleteAllowance(): Promise<void> {
    if (!deletingAllowance) return;
    const res = await window.api.allowances.remove(deletingAllowance.id);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    toast('success', 'Harçlık silindi');
    setDeletingAllowance(null);
    loadDetails();
  }

  if (persons.length === 0) {
    return (
      <EmptyState
        title="Henüz kişi yok"
        description="Hane içindeki kişileri ekleyerek harçlık takibini başlatabilirsiniz."
        actionLabel="Yeni Kişi Ekle"
        onAction={() => {
          setEditingPerson(null);
          setPersonFormOpen(true);
        }}
      />
    );
  }

  const selected = persons.find((p) => p.id === selectedId) ?? null;
  const personAllowances = selected
    ? allowances.filter((a) => a.person_id === selected.id)
    : [];
  const personBills = selected
    ? bills.filter(
        (b) => b.paid_for_person_id === selected.id && b.status === 'Ödendi' && b.paid_date != null,
      )
    : [];
  const computed = selected
    ? computePersonAllowance(selected.id, year, month, allowances, bills)
    : { cash: 0, bills: 0, total: 0 };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {formatMonthLabel(year, month)} • {persons.length} kişi
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingPerson(null);
              setPersonFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yeni Kişi
          </Button>
          {selected ? (
            <Button
              onClick={() => {
                setEditingAllowance(null);
                setAllowanceFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Harçlık Ekle
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Persons list */}
        <Card>
          <CardContent className="p-2">
            <ul className="flex flex-col gap-1">
              {persons.map((p) => {
                const isSelected = p.id === selectedId;
                const personComputed = computePersonAllowance(p.id, year, month, allowances, bills);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        'w-full rounded-md p-3 text-left transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.name}</span>
                        {!p.is_active ? <Badge tone="muted">Pasif</Badge> : null}
                      </div>
                      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {formatTRY(personComputed.total)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Selected person detail */}
        {selected ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold">{selected.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatMonthLabel(year, month)} aylık harçlık
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePersonActive(selected)}
                      title={selected.is_active ? 'Pasif yap' : 'Aktif yap'}
                    >
                      {selected.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingPerson(selected);
                        setPersonFormOpen(true);
                      }}
                      aria-label="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingPerson(selected)}
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">Nakit Harçlık</div>
                    <div className="mt-1 text-lg font-bold tabular-nums">
                      {formatTRY(computed.cash)}
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">Adına Ödenen Faturalar</div>
                    <div className="mt-1 text-lg font-bold tabular-nums">
                      {formatTRY(computed.bills)}
                    </div>
                  </div>
                  <div className="rounded-md border-2 border-primary bg-primary/5 p-3">
                    <div className="text-xs text-primary">Toplam Harçlık</div>
                    <div className="mt-1 text-lg font-bold tabular-nums text-primary">
                      {formatTRY(computed.total)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash allowances */}
            <Card>
              <CardContent className="p-0">
                <div className="border-b p-3 text-xs font-medium text-muted-foreground">
                  NAKİT HARÇLIKLAR ({personAllowances.length})
                </div>
                {loading ? (
                  <div className="p-4 text-sm text-muted-foreground">Yükleniyor…</div>
                ) : personAllowances.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Bu ay için nakit harçlık yok.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {personAllowances.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums text-muted-foreground">
                            {formatDateTR(a.date)}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{a.note ?? '—'}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">
                            {formatTRY(a.amount)}
                          </td>
                          <td className="w-20 px-4 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingAllowance(a);
                                  setAllowanceFormOpen(true);
                                }}
                                aria-label="Düzenle"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingAllowance(a)}
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
                )}
              </CardContent>
            </Card>

            {/* Bills paid for this person */}
            <Card>
              <CardContent className="p-0">
                <div className="border-b p-3 text-xs font-medium text-muted-foreground">
                  ADINA ÖDENEN FATURALAR ({personBills.length})
                </div>
                {personBills.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Bu ay için adına ödenen fatura yok.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {personBills.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums text-muted-foreground">
                            {b.paid_date ? formatDateTR(b.paid_date) : '—'}
                          </td>
                          <td className="px-4 py-2 font-medium">{b.name}</td>
                          <td className="px-4 py-2">
                            <Badge tone="muted">{b.bill_type}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">
                            {formatTRY(b.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState title="Bir kişi seçin" description="Sol listeden bir kişi seçerek detaylarını görüntüleyin." />
        )}
      </div>

      <PersonFormDialog
        open={personFormOpen}
        onOpenChange={setPersonFormOpen}
        editing={editingPerson}
        onSaved={() => {
          setPersonFormOpen(false);
          reloadPersons();
        }}
      />

      <AllowanceFormDialog
        open={allowanceFormOpen}
        onOpenChange={setAllowanceFormOpen}
        editing={editingAllowance}
        defaultPersonId={selectedId}
        onSaved={() => {
          setAllowanceFormOpen(false);
          loadDetails();
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingPerson)}
        title="Kişiyi sil"
        description={
          deletingPerson
            ? `"${deletingPerson.name}" silinmek üzere. Eğer bu kişiye ait gelir veya harçlık kaydı varsa silme işlemi başarısız olacaktır.`
            : ''
        }
        destructive
        confirmLabel="Sil"
        onConfirm={handleDeletePerson}
        onCancel={() => setDeletingPerson(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingAllowance)}
        title="Harçlığı sil"
        description={
          deletingAllowance
            ? `${formatTRY(deletingAllowance.amount)} tutarındaki harçlık silinecek.`
            : ''
        }
        destructive
        confirmLabel="Sil"
        onConfirm={handleDeleteAllowance}
        onCancel={() => setDeletingAllowance(null)}
      />
    </div>
  );
}
