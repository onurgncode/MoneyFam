import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Database } from 'lucide-react';
import type { CsvKind, DateRange, ReportData } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Badge } from '@renderer/components/ui/badge';
import { EmptyState } from '@renderer/components/common/EmptyState';
import {
  CompareBarChart,
  HorizontalBars,
  PieBreakdown,
  TrendLineChart,
} from '@renderer/components/charts';
import { toast } from '@renderer/stores/toastStore';
import { formatTRY } from '@renderer/lib/currency';
import { currentYearMonth, formatMonthLabel } from '@renderer/lib/date';

type Preset = 'thisMonth' | 'last3' | 'last6' | 'last12' | 'thisYear' | 'custom';

interface PresetDef {
  key: Preset;
  label: string;
}

const PRESETS: PresetDef[] = [
  { key: 'thisMonth', label: 'Bu Ay' },
  { key: 'last3', label: 'Son 3 Ay' },
  { key: 'last6', label: 'Son 6 Ay' },
  { key: 'last12', label: 'Son 12 Ay' },
  { key: 'thisYear', label: 'Bu Yıl' },
  { key: 'custom', label: 'Özel' },
];

function buildRange(preset: Preset): DateRange {
  const { year, month } = currentYearMonth();
  const back = (n: number): { y: number; m: number } => {
    let y = year;
    let m = month - n;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    return { y, m };
  };
  switch (preset) {
    case 'thisMonth':
      return { startYear: year, startMonth: month, endYear: year, endMonth: month };
    case 'last3': {
      const s = back(2);
      return { startYear: s.y, startMonth: s.m, endYear: year, endMonth: month };
    }
    case 'last6': {
      const s = back(5);
      return { startYear: s.y, startMonth: s.m, endYear: year, endMonth: month };
    }
    case 'last12': {
      const s = back(11);
      return { startYear: s.y, startMonth: s.m, endYear: year, endMonth: month };
    }
    case 'thisYear':
      return { startYear: year, startMonth: 1, endYear: year, endMonth: month };
    default:
      return { startYear: year, startMonth: month, endYear: year, endMonth: month };
  }
}

function rangeToInputs(range: DateRange): { start: string; end: string } {
  const fmt = (y: number, m: number): string => `${y}-${String(m).padStart(2, '0')}`;
  return { start: fmt(range.startYear, range.startMonth), end: fmt(range.endYear, range.endMonth) };
}

function inputToRange(start: string, end: string): DateRange | null {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return null;
  if (ey < sy || (ey === sy && em < sm)) return null;
  return { startYear: sy, startMonth: sm, endYear: ey, endMonth: em };
}

interface Props {
  exportKey?: number;
}

export function Reports({ exportKey }: Props): React.ReactElement {
  const [preset, setPreset] = useState<Preset>('last6');
  const [range, setRange] = useState<DateRange>(() => buildRange('last6'));
  const inputs = useMemo(() => rangeToInputs(range), [range]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    const res = await window.api.reports.get(range);
    if (!res.ok) {
      toast('error', `Rapor yüklenemedi: ${res.error}`);
      setLoading(false);
      return;
    }
    setData(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [range]);

  useEffect(() => {
    if (exportKey && exportKey > 0) setShowExportMenu(true);
  }, [exportKey]);

  function applyPreset(p: Preset): void {
    setPreset(p);
    if (p !== 'custom') setRange(buildRange(p));
  }

  function applyCustom(start: string, end: string): void {
    const r = inputToRange(start, end);
    if (!r) {
      toast('error', 'Bitiş tarihi başlangıçtan önce olamaz');
      return;
    }
    setPreset('custom');
    setRange(r);
  }

  async function handleExportCsv(kind: CsvKind): Promise<void> {
    setShowExportMenu(false);
    const res = await window.api.backup.exportCsv(kind);
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    if (res.data.saved) toast('success', `CSV kaydedildi: ${res.data.path}`);
  }

  async function handleExportPdf(): Promise<void> {
    setShowExportMenu(false);
    // Önce yazdırma moduna geçir (CSS classroom)
    document.body.classList.add('print-mode');
    await new Promise((r) => setTimeout(r, 100));
    const res = await window.api.backup.exportPdf();
    document.body.classList.remove('print-mode');
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    if (res.data.saved) toast('success', `PDF kaydedildi: ${res.data.path}`);
  }

  async function handleExportDb(): Promise<void> {
    setShowExportMenu(false);
    const res = await window.api.backup.exportDb();
    if (!res.ok) {
      toast('error', res.error);
      return;
    }
    if (res.data.saved) toast('success', `Yedek kaydedildi: ${res.data.path}`);
  }

  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  const { totals, monthly, billTypeBreakdown, expenseCategoryBreakdown, personAllowances } = data;

  const monthlyChartData = monthly.map((m) => ({
    label: `${formatMonthLabel(m.year, m.month).slice(0, 3)} ${String(m.year).slice(2)}`,
    income: m.income,
    expense: m.expense,
    remaining: m.remaining,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Range picker + export */}
      <Card className="no-print">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  preset === p.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' ? (
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="r-start">Başlangıç</Label>
                <Input
                  id="r-start"
                  type="month"
                  value={inputs.start}
                  onChange={(e) => applyCustom(e.target.value, inputs.end)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="r-end">Bitiş</Label>
                <Input
                  id="r-end"
                  type="month"
                  value={inputs.end}
                  onChange={(e) => applyCustom(inputs.start, e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {formatMonthLabel(range.startYear, range.startMonth)} →{' '}
              {formatMonthLabel(range.endYear, range.endMonth)}
            </span>
            <div className="relative">
              <Button onClick={() => setShowExportMenu((s) => !s)}>
                <Download className="h-4 w-4" /> Dışa Aktar
              </Button>
              {showExportMenu ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border bg-card shadow-lg">
                    <button
                      onClick={handleExportPdf}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4" />
                      Bu raporu PDF olarak kaydet
                    </button>
                    <div className="border-t" />
                    <ExportSubmenu onExport={handleExportCsv} />
                    <div className="border-t" />
                    <button
                      onClick={handleExportDb}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Database className="h-4 w-4" />
                      Veritabanını yedekle (.db)
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Bütçe Raporu</h1>
        <div className="text-sm text-muted-foreground">
          {formatMonthLabel(range.startYear, range.startMonth)} →{' '}
          {formatMonthLabel(range.endYear, range.endMonth)}
          {' • '}
          {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Toplam Gelir</div>
            <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatTRY(totals.income)}
            </div>
            <div className="text-xs text-muted-foreground">
              ortalama {formatTRY(totals.avgIncome)}/ay
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Toplam Gider</div>
            <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
              {formatTRY(totals.expense)}
            </div>
            <div className="text-xs text-muted-foreground">
              ortalama {formatTRY(totals.avgExpense)}/ay
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Kalan</div>
            <div
              className={`text-xl font-bold tabular-nums ${
                totals.remaining >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatTRY(totals.remaining)}
            </div>
            <div className="text-xs text-muted-foreground">{totals.monthsCount} ay</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Tasarruf Oranı</div>
            <div className="text-xl font-bold tabular-nums">
              {totals.income > 0 ? `${((totals.remaining / totals.income) * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">geliri kalana oranla</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      {monthly.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aylık Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={monthlyChartData} />
          </CardContent>
        </Card>
      ) : null}

      {/* Monthly table */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Detay</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Ay</th>
                <th className="px-4 py-2 text-right font-medium">Gelir</th>
                <th className="px-4 py-2 text-right font-medium">Gider</th>
                <th className="px-4 py-2 text-right font-medium">Kalan</th>
                <th className="px-4 py-2 text-right font-medium">Tasarruf %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthly.map((m) => {
                const pct = m.income > 0 ? ((m.remaining / m.income) * 100).toFixed(1) : '—';
                return (
                  <tr key={`${m.year}-${m.month}`} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{formatMonthLabel(m.year, m.month)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatTRY(m.income)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                      {formatTRY(m.expense)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatTRY(m.remaining)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {pct === '—' ? '—' : `${pct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 bg-muted/30 font-semibold">
              <tr>
                <td className="px-4 py-2">Toplam</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatTRY(totals.income)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatTRY(totals.expense)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatTRY(totals.remaining)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {totals.income > 0 ? `${((totals.remaining / totals.income) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Compare chart */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Karşılaştırma</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <EmptyState title="Veri yok" />
          ) : (
            <CompareBarChart data={monthlyChartData} />
          )}
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fatura Türü Bazlı (toplam)</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={billTypeBreakdown.map((b) => ({ name: b.bill_type, value: b.total }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Harcama Kategorisi Bazlı (toplam)</CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown
              data={expenseCategoryBreakdown.map((c) => ({ name: c.category, value: c.total }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Person allowances */}
      <Card>
        <CardHeader>
          <CardTitle>Kişi Bazlı Harçlık (dönem toplamı)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {personAllowances.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Bu dönem için kişi harçlığı yok.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Kişi</th>
                  <th className="px-4 py-2 text-right font-medium">Nakit</th>
                  <th className="px-4 py-2 text-right font-medium">Adına Ödenen Faturalar</th>
                  <th className="px-4 py-2 text-right font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {personAllowances.map((p) => (
                  <tr key={p.person_id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">
                      <Badge tone="default">{p.person_name}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatTRY(p.cash)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatTRY(p.bills)}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatTRY(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportSubmenu({ onExport }: { onExport: (kind: CsvKind) => void }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const options: Array<{ kind: CsvKind; label: string }> = [
    { kind: 'all', label: 'Tüm tablolar' },
    { kind: 'income', label: 'Gelirler' },
    { kind: 'bills', label: 'Faturalar' },
    { kind: 'allowances', label: 'Harçlıklar' },
    { kind: 'expenses', label: 'Harcamalar' },
    { kind: 'debts', label: 'Borçlar' },
    { kind: 'debt_payments', label: 'Borç Ödemeleri' },
  ];
  return (
    <div>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> CSV olarak kaydet
        </span>
        <span className="text-xs text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="border-t bg-muted/30">
          {options.map((o) => (
            <button
              key={o.kind}
              onClick={() => onExport(o.kind)}
              className="block w-full px-6 py-1.5 text-left text-sm hover:bg-accent"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
