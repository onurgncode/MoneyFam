import { useLocation } from 'react-router-dom';
import { MonthSelector } from './MonthSelector';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/income': 'Gelir',
  '/bills': 'Faturalar',
  '/expenses': 'Aylık Harcamalar',
  '/debts': 'Borçlar',
  '/people': 'Kişiler & Harçlıklar',
  '/reports': 'Raporlar',
  '/settings': 'Ayarlar',
};

interface Props {
  showMonthSelector?: boolean;
  rightSlot?: React.ReactNode;
}

export function TopBar({ showMonthSelector = true, rightSlot }: Props): React.ReactElement {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? '';
  return (
    <header className="titlebar-drag flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="titlebar-no-drag flex items-center gap-3">
        {rightSlot}
        {showMonthSelector ? <MonthSelector /> : null}
      </div>
    </header>
  );
}
