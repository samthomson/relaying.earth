import { useMemo } from 'react';

import { SensorReadingValue } from '@/components/SensorReadingValue';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import { getSensorName } from '@/lib/weatherUtils';

interface SensorSummaryProps {
  sensorCount: number;
  okCount: number;
}

export function SensorSummary({ sensorCount, okCount }: SensorSummaryProps) {
  const faultCount = sensorCount - okCount;

  if (sensorCount === 0) {
    return <p className="text-xs text-muted-foreground">No sensors declared.</p>;
  }

  return (
    <p className="text-xs text-muted-foreground">
      {sensorCount} sensor{sensorCount === 1 ? '' : 's'}
      {faultCount === 0
        ? ', all OK'
        : ` · ${faultCount} fault${faultCount === 1 ? '' : 's'}`}
    </p>
  );
}

interface LatestReadingListProps {
  readings: Array<{ type: string; value: string; model?: string }>;
}

/** Vertical list — readable on narrow panels and mobile. */
export function LatestReadingList({ readings }: LatestReadingListProps) {
  const { formatSensorValue } = useWeatherFormatters();

  // Readings arrive flat; group them by physical sensor model for context.
  // Single-model stations keep the original flat list — nothing to convey.
  const groups = useMemo(() => {
    const byModel = new Map<string, Array<{ type: string; value: string }>>();
    for (const reading of readings) {
      const model = reading.model ?? '';
      const bucket = byModel.get(model);
      if (bucket) bucket.push(reading);
      else byModel.set(model, [reading]);
    }
    return [...byModel.entries()].map(([model, items]) => ({ model, items }));
  }, [readings]);

  if (groups.length <= 1) {
    return (
      <ul className="divide-y divide-border/40">
        {readings.map((reading, idx) => (
          <ReadingRow
            key={`${reading.type}-${idx}`}
            reading={reading}
            formatSensorValue={formatSensorValue}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2.5">
      {groups.map((group) => (
        <div key={group.model}>
          <div className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {group.model || 'Sensor'}
          </div>
          <ul>
            {group.items.map((reading, idx) => (
              <ReadingRow
                key={`${group.model}-${reading.type}-${idx}`}
                reading={reading}
                formatSensorValue={formatSensorValue}
                compact
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ReadingRow({
  reading,
  formatSensorValue,
  compact = false,
}: {
  reading: { type: string; value: string };
  formatSensorValue: (type: string, value: string) => string;
  compact?: boolean;
}) {
  return (
    <li
      className={`flex items-baseline justify-between gap-3 ${compact ? 'py-1.5' : 'py-2'} first:pt-0 last:pb-0`}
    >
      <span className="text-sm text-muted-foreground">{getSensorName(reading.type)}</span>
      <SensorReadingValue
        type={reading.type}
        value={reading.value}
        formattedValue={formatSensorValue(reading.type, reading.value)}
        variant="inline"
      />
    </li>
  );
}
