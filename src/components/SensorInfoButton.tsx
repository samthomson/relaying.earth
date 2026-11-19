import { Info } from 'lucide-react';

import { GuideSectionView } from '@/components/SensorInterpretationGuide';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getSensorGuideSection } from '@/lib/sensorInterpretations';
import { cn } from '@/lib/utils';

interface SensorInfoButtonProps {
  type: string;
  model?: string;
  className?: string;
}

/**
 * Per-value ⓘ — opens a dialog explaining this sensor's scale, bands, and
 * what the current reading means. Rendered only when guide content exists
 * for the sensor type.
 */
export function SensorInfoButton({ type, model, className }: SensorInfoButtonProps) {
  const section = getSensorGuideSection(type, model);
  if (!section) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`About the ${section.title} reading`}
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            className,
          )}
        >
          <Info className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{section.title}</DialogTitle>
          <DialogDescription>
            Scale, bands, and what the current value means.
            {model ? ` Model: ${model}.` : ''}
          </DialogDescription>
        </DialogHeader>
        <GuideSectionView section={section} showTitle={false} />
      </DialogContent>
    </Dialog>
  );
}
