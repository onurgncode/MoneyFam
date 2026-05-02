import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { useMonthStore } from '@renderer/stores/monthStore';
import { formatMonthLabel } from '@renderer/lib/date';

export function MonthSelector(): React.ReactElement {
  const { year, month, goPrev, goNext, goToday } = useMonthStore();
  return (
    <div className="flex items-center gap-1 rounded-md border bg-card p-1">
      <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Önceki ay">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        onClick={goToday}
        className="flex items-center gap-2 rounded px-3 py-1 text-sm font-medium hover:bg-accent"
        title="Bu aya dön"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {formatMonthLabel(year, month)}
      </button>
      <Button variant="ghost" size="icon" onClick={goNext} aria-label="Sonraki ay">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
