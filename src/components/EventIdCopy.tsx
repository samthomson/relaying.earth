import { clipEventId } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

import { CopyButton } from '@/components/CopyButton';

interface EventIdCopyProps {
  eventId: string;
  className?: string;
}

export function EventIdCopy({ eventId, className }: EventIdCopyProps) {
  return (
    <div className={cn('inline-flex flex-col items-center gap-0', className)}>
      <span
        className="whitespace-nowrap font-mono text-[10px] leading-none text-muted-foreground"
        title={eventId}
      >
        {clipEventId(eventId)}
      </span>
      <CopyButton
        value={eventId}
        successMessage="Event ID copied"
        errorMessage="Could not copy event ID"
        aria-label="Copy event ID"
        className="h-4 w-4"
      />
    </div>
  );
}
