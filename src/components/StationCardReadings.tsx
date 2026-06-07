import { useMemo } from 'react';

import { SensorReadingValue } from '@/components/SensorReadingValue';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import { getSensorShortName, sortSensorTypes } from '@/lib/weatherUtils';

interface StationCardReadingsProps {
  readings: Array<{ type: string; value: string }>;
}

/** Compact vertical list for station cards — no grid orphans, aligned rows. */
export function StationCardReadings({ readings }: StationCardReadingsProps) {
  const { formatSensorValue } = useWeatherFormatters();

  const sortedReadings = useMemo(() => {
    const types = readings.map((reading) => reading.type);
    return sortSensorTypes(types)
      .map((type) => readings.find((reading) => reading.type === type))
      .filter((reading): reading is { type: string; value: string } => reading !== undefined);
  }, [readings]);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-0.5">
      <ul>
        {sortedReadings.map((reading, idx) => (
          <li
            key={`${reading.type}-${idx}`}
            className="flex items-center justify-between gap-3 border-b border-border/35 py-2 last:border-b-0"
          >
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {getSensorShortName(reading.type)}
            </span>
            <SensorReadingValue
              type={reading.type}
              value={reading.value}
              formattedValue={formatSensorValue(reading.type, reading.value)}
              variant="inline"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
