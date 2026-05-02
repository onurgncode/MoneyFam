import { Card, CardContent } from '@renderer/components/ui/card';
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { formatTRY } from '@renderer/lib/currency';
import { percentChange } from '@renderer/lib/calc/monthly';

interface Props {
  label: string;
  value: number;
  prevValue: number;
  icon: LucideIcon;
  tone: 'positive' | 'negative' | 'neutral' | 'accent';
  /** When true, "increase" is bad (e.g. expenses). */
  invertChange?: boolean;
}

const TONE_CLASS: Record<Props['tone'], string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
  accent: 'text-blue-600 dark:text-blue-400',
};

export function KpiCard({ label, value, prevValue, icon: Icon, tone, invertChange }: Props): React.ReactElement {
  const change = percentChange(value, prevValue);
  const goodChange = change == null ? false : invertChange ? change < 0 : change > 0;
  const ChangeIcon = change == null ? Minus : change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  const changeColor =
    change == null
      ? 'text-muted-foreground'
      : goodChange
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <Icon className={cn('h-4 w-4', TONE_CLASS[tone])} />
        </div>
        <div className={cn('mt-2 text-2xl font-bold tabular-nums', TONE_CLASS[tone])}>
          {formatTRY(value)}
        </div>
        <div className={cn('mt-1 flex items-center gap-1 text-xs', changeColor)}>
          <ChangeIcon className="h-3 w-3" />
          <span>
            {change == null ? 'önceki ay verisi yok' : `${Math.abs(change).toFixed(1)}% (geçen aya göre)`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
