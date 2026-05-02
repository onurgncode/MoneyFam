import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: Props): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <div className="text-base font-medium">{title}</div>
      {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
