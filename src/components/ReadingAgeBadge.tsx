import { formatRelativeTime } from '@/lib/timeUtils';
import { useNow } from '@/hooks/useNow';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReadingAgeBadgeProps {
  timestamp?: number;
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
}

export function ReadingAgeBadge({
  timestamp,
  loading = false,
  emptyLabel = 'No readings',
  className,
}: ReadingAgeBadgeProps) {
  const now = useNow(1000);
  const baseClass =
    'shrink-0 font-mono text-[10px] uppercase tracking-widest';

  if (loading) {
    return (
      <Badge
        variant="outline"
        className={cn(baseClass, 'border-border/60 bg-muted/40 text-muted-foreground', className)}
      >
        …
      </Badge>
    );
  }

  if (timestamp === undefined) {
    return (
      <Badge
        variant="outline"
        className={cn(baseClass, 'border-border/60 bg-muted/40 text-muted-foreground', className)}
      >
        {emptyLabel}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        baseClass,
        'border-primary/25 bg-primary/10 text-primary',
        className,
      )}
    >
      {formatRelativeTime(timestamp, now.getTime())}
    </Badge>
  );
}
