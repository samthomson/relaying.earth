import { useMemo } from 'react';

import { SensorReadingValue } from '@/components/SensorReadingValue';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import {
  getSensorColumnLabel,
  getSensorColumns,
  matchSensorColumn,
  sensorColumnKey,
  type SensorColumn,
} from '@/lib/weatherUtils';

interface StationCardReadingsProps {
  readings: Array<{ type: string; value: string; model?: string }>;
}

/** Compact vertical list for station cards — no grid orphans, aligned rows. */
export function StationCardReadings({ readings }: StationCardReadingsProps) {
  const { formatSensorValue } = useWeatherFormatters();

  // Columns keep preferred sensor order and attach the hardware model when a
  // type is reported by several physical sensors (e.g. three soil probes).
  const rows = useMemo(
    () =>
      getSensorColumns([readings])
        .map((column: SensorColumn) => {
          const reading = readings.find((r) => matchSensorColumn(r, column));
          return reading ? { column, reading } : null;
        })
        .filter((row): row is { column: SensorColumn; reading: { type: string; value: string; model?: string } } =>
          row !== null,
        ),
    [readings],
  );

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-0.5">
      <ul>
        {rows.map(({ column, reading }) => (
          <li
            key={sensorColumnKey(column)}
            className="flex items-center justify-between gap-3 border-b border-border/35 py-2 last:border-b-0"
          >
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {getSensorColumnLabel(column)}
            </span>
            <SensorReadingValue
              type={reading.type}
              value={reading.value}
              model={reading.model}
              formattedValue={formatSensorValue(reading.type, reading.value)}
              variant="inline"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
