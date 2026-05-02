import { useToastStore } from '@renderer/stores/toastStore';
import { cn } from '@renderer/lib/cn';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE = {
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
  info: 'border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
};

export function ToastContainer(): React.ReactElement {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {items.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-md border p-3 shadow-lg animate-in slide-in-from-right',
              TONE[t.kind],
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 text-sm">{t.message}</div>
            <button onClick={() => dismiss(t.id)} aria-label="Kapat">
              <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
