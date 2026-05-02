import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Banknote,
  FileText,
  CreditCard,
  ShoppingBag,
  Users,
  ClipboardList,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@renderer/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  enabled: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, shortcut: '⌘1', enabled: true },
  { to: '/income', label: 'Gelir', icon: Banknote, shortcut: '⌘2', enabled: true },
  { to: '/bills', label: 'Faturalar', icon: FileText, shortcut: '⌘3', enabled: true },
  { to: '/expenses', label: 'Harcamalar', icon: ShoppingBag, shortcut: '⌘4', enabled: true },
  { to: '/debts', label: 'Borçlar', icon: CreditCard, shortcut: '⌘5', enabled: true },
  { to: '/people', label: 'Kişiler', icon: Users, shortcut: '⌘6', enabled: true },
  { to: '/reports', label: 'Raporlar', icon: ClipboardList, shortcut: '⌘7', enabled: true },
];

export function Sidebar(): React.ReactElement {
  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <div className="titlebar-drag flex h-12 shrink-0 items-center px-4 pl-20">
        <span className="text-sm font-semibold">MoneyFam</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div
                key={item.to}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50"
                title="Yakında (Aşama 2-3)"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs">{item.shortcut}</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <Settings className="h-4 w-4" />
          <span className="flex-1">Ayarlar</span>
          <span className="text-xs">⌘,</span>
        </NavLink>
      </div>
    </aside>
  );
}
