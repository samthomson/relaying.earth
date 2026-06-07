import { useMemo } from 'react';

import { EventIdCopy } from '@/components/EventIdCopy';
import { SensorReadingValue } from '@/components/SensorReadingValue';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import {
  formatAbsoluteTime,
  formatRelativeTime,
} from '@/lib/timeUtils';
import { getSensorShortName, sortSensorTypes } from '@/lib/weatherUtils';
import { cn } from '@/lib/utils';

export interface ReadingTableRow {
  id: string;
  timestamp?: number;
  readings: Array<{ type: string; value: string }>;
  eventId?: string;
}

interface ReadingsTableProps {
  rows: ReadingTableRow[];
  sensorTypes?: string[];
  /** `grid` for latest-reading cards; `events` for responsive event history. */
  layout?: 'grid' | 'events';
  className?: string;
}

function ReadingGrid({
  readings,
  className,
}: {
  readings: Array<{ type: string; value: string }>;
  className?: string;
}) {
  const { formatSensorValue } = useWeatherFormatters();

  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3', className)}>
      {readings.map((reading, idx) => (
        <div key={`${reading.type}-${idx}`}>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            {getSensorShortName(reading.type)}
          </div>
          <SensorReadingValue
            type={reading.type}
            value={reading.value}
            formattedValue={formatSensorValue(reading.type, reading.value)}
            variant="stacked"
          />
        </div>
      ))}
    </div>
  );
}

function EventCards({ rows }: { rows: ReadingTableRow[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-lg border border-border/60 bg-card/40 p-3"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            {row.timestamp !== undefined ? (
              <div>
                <div className="font-medium text-foreground">
                  {formatRelativeTime(row.timestamp)}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {formatAbsoluteTime(row.timestamp)}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            {row.eventId && <EventIdCopy eventId={row.eventId} />}
          </div>
          <ReadingGrid readings={row.readings} className="grid-cols-2" />
        </article>
      ))}
    </div>
  );
}

function EventTable({
  rows,
  sensorTypes,
}: {
  rows: ReadingTableRow[];
  sensorTypes: string[];
}) {
  const { formatSensorValue } = useWeatherFormatters();

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <th className="py-2 pr-4 font-normal whitespace-nowrap">When</th>
            {sensorTypes.map((type) => (
              <th key={type} className="py-2 pr-4 font-normal whitespace-nowrap">
                {getSensorShortName(type)}
              </th>
            ))}
            <th className="w-16 py-2 pl-2 font-normal text-center">Event</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/40 last:border-b-0 hover:bg-muted/15"
            >
              <td className="py-2.5 pr-4 align-top whitespace-nowrap">
                {row.timestamp !== undefined ? (
                  <>
                    <div className="font-medium text-foreground">
                      {formatRelativeTime(row.timestamp)}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {formatAbsoluteTime(row.timestamp)}
                    </div>
                  </>
                ) : (
                  '—'
                )}
              </td>
              {sensorTypes.map((type) => {
                const reading = row.readings.find((r) => r.type === type);
                return (
                  <td
                    key={`${row.id}-${type}`}
                    className="py-2.5 pr-4 align-top whitespace-nowrap"
                  >
                    {reading ? (
                      <SensorReadingValue
                        type={reading.type}
                        value={reading.value}
                        formattedValue={formatSensorValue(reading.type, reading.value)}
                        variant="stacked"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                );
              })}
              <td className="py-2.5 pl-2 align-top">
                {row.eventId && (
                  <EventIdCopy eventId={row.eventId} className="mx-auto" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReadingsTable({
  rows,
  sensorTypes: fixedSensorTypes,
  layout = 'grid',
  className,
}: ReadingsTableProps) {
  const sensorTypes = useMemo(() => {
    if (fixedSensorTypes && fixedSensorTypes.length > 0) {
      return sortSensorTypes(fixedSensorTypes);
    }
    const types = new Set<string>();
    rows.forEach((row) => row.readings.forEach((r) => types.add(r.type)));
    return sortSensorTypes(types);
  }, [rows, fixedSensorTypes]);

  if (rows.length === 0) return null;

  if (layout === 'grid') {
    return (
      <div className={className}>
        <ReadingGrid readings={rows[0].readings} />
      </div>
    );
  }

  return (
    <div className={className}>
      <EventCards rows={rows} />
      <EventTable rows={rows} sensorTypes={sensorTypes} />
    </div>
  );
}
