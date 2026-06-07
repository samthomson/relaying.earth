import { cn } from '@/lib/utils';
import {
  getSensorIndicatorClass,
  getSensorInterpretation,
} from '@/lib/sensorInterpretations';

interface SensorReadingValueProps {
  type: string;
  value: string;
  formattedValue: string;
  /** `stacked` — value with label below; `inline` — right-aligned list cell. */
  variant?: 'stacked' | 'inline';
  className?: string;
}

export function SensorReadingValue({
  type,
  value,
  formattedValue,
  variant = 'stacked',
  className,
}: SensorReadingValueProps) {
  const interpretation = getSensorInterpretation(type, value);

  if (variant === 'inline') {
    if (!interpretation) {
      return (
        <span className={cn('font-medium tabular-nums text-foreground', className)}>
          {formattedValue}
        </span>
      );
    }

    return (
      <span className={cn('inline-flex flex-col items-end gap-0.5', className)}>
        <span className="font-medium tabular-nums text-foreground">{formattedValue}</span>
        <SensorInterpretationBadge interpretation={interpretation} />
      </span>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-sm font-semibold tabular-nums leading-none text-foreground">
        {formattedValue}
      </div>
      <div className="min-h-[14px]">
        {interpretation && (
          <SensorInterpretationBadge interpretation={interpretation} />
        )}
      </div>
    </div>
  );
}

function SensorInterpretationBadge({
  interpretation,
}: {
  interpretation: NonNullable<ReturnType<typeof getSensorInterpretation>>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] leading-none"
      title={interpretation.detail}
    >
      {interpretation.indicator && (
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            getSensorIndicatorClass(interpretation.indicator),
          )}
          aria-hidden
        />
      )}
      <span className="text-muted-foreground">{interpretation.label}</span>
    </span>
  );
}
