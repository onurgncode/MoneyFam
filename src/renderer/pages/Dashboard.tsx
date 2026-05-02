import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, Calendar } from 'lucide-react';
import type { DashboardData } from '@shared/types';
import { useMonthStore } from '@renderer/stores/monthStore';
import { toast } from '@renderer/stores/toastStore';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { KpiCard } from '@renderer/components/common/KpiCard';
import { EmptyState } from '@renderer/components/common/EmptyState';
import {
  CompareBarChart,
  HorizontalBars,
  PieBreakdown,
  TrendLineChart,
} from '@renderer/components/charts';
import { CATEGORY_COLORS } from '@shared/constants';
import { formatTRY } from '@renderer/lib/currency';
import { formatDateTR, formatMonthLabel } from '@renderer/lib/date';

export function Dashboard(): React.ReactElement {
  const { year, month } = useMonthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    window.api.dashboard.get({ year, month }).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        toast('error', `Dashboard yüklenemedi: ${res.error}`);
        setLoading(false);
        return;
      }
      setData(res.data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [year, month]);

  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  const { summary, prevSummary, personAllowances, billTypeBreakdown, expenseCategoryBreakdown, trend6m, upcoming } = data;

  const compareData = [
    {
      label: formatMonthLabel(prevSummary.year, prevSummary.month),
      income: prevSummary.income,
      expense: prevSummary.expense,
      remaining: prevSummary.remaining,
    },
    {
      label: formatMonthLabel(summary.year, summary.month),
      income: summary.income,
      expense: summary.expense,
      remaining: summary.remaining,
    },
  ];

  const breakdownPie = [
    { name: 'Faturalar', value: summary.householdBills + summary.personalBills },
    { name: 'Harçlıklar (nakit)', value: summary.cashAllowances },
    { name: 'Borçlar', value: summary.debtPayments },
    { name: 'Harcamalar', value: summary.expenses },
  ];

  const personPie = personAllowances
    .filter((p) => p.total > 0)
    .map((p) => ({ name: p.person_name, value: p.total }));

  const trendData = trend6m.map((p) => ({
    label: formatMonthLabel(p.year, p.month).slice(0, 3) + ' ' + String(p.year).slice(2),
    income: p.income,
    expense: p.expense,
  }));

  const expensePieColors = expenseCategoryBreakdown.map(
    (c) => CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS] ?? '#6b7280',
  );

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Toplam Gelir"
          value={summary.income}
          prevValue={prevSummary.income}
          icon={TrendingUp}
          tone="positive"
        />
        <KpiCard
          label="Toplam Gider"
          value={summary.expense}
          prevValue={prevSummary.expense}
          icon={TrendingDown}
          tone="negative"
          invertChange
        />
        <KpiCard
          label="Kalan"
          value={summary.remaining}
          prevValue={prevSummary.remaining}
          icon={Wallet}
          tone={summary.remaining >= 0 ? 'accent' : 'negative'}
        />
        <KpiCard
          label="Tasarruf Hedefi"
          value={summary.savingsTarget}
          prevValue={prevSummary.savingsTarget}
          icon={PiggyBank}
          tone="neutral"
        />
      </div>

      {summary.income === 0 && summary.expense === 0 ? (
        <EmptyState
          title={`${formatMonthLabel(year, month)} için veri yok`}
          description="Gelir, fatura veya harcama eklemeye sol menüden başlayabilirsiniz."
        />
      ) : null}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gelir vs Gider vs Kalan</CardTitle>
          </CardHeader>
          <CardContent>
            <CompareBarChart data={compareData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gider Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={breakdownPie} />
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kişi Bazlı Harçlık</CardTitle>
          </CardHeader>
          <CardContent>
            {personPie.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                Bu ay için kişi bazlı harçlık yok
              </div>
            ) : (
              <PieBreakdown data={personPie} />
            )}
            <div className="mt-2 space-y-1">
              {personAllowances.map((p) => (
                <div key={p.person_id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.person_name}</span>
                  <span className="text-muted-foreground">
                    Nakit {formatTRY(p.cash)} + Fatura {formatTRY(p.bills)} ={' '}
                    <span className="font-semibold text-foreground">{formatTRY(p.total)}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fatura Türü Bazlı Tutar</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={billTypeBreakdown.map((b) => ({ name: b.bill_type, value: b.total }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Harcama Kategorileri</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars
              data={expenseCategoryBreakdown.map((c) => ({ name: c.category, value: c.total }))}
              color={expensePieColors[0] ?? '#3b82f6'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son 6 Ay Gelir/Gider Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={trendData} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Yaklaşan Ödemeler (Önümüzdeki 7 gün)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">Yaklaşan bir ödemeniz yok.</div>
          ) : (
            <ul className="divide-y">
              {upcoming.map((p) => (
                <li key={`${p.kind}-${p.id}`} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    {p.status === 'overdue' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                    <Badge tone={p.kind === 'bill' ? 'default' : 'muted'}>
                      {p.kind === 'bill' ? 'Fatura' : 'Borç'}
                    </Badge>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{formatDateTR(p.due_date)}</span>
                    <span className="font-semibold tabular-nums">{formatTRY(p.amount)}</span>
                    <Badge
                      tone={p.status === 'overdue' ? 'danger' : p.status === 'soon' ? 'warning' : 'muted'}
                    >
                      {p.status === 'overdue' ? 'Gecikti' : p.status === 'soon' ? '3 gün içinde' : '7 gün içinde'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
