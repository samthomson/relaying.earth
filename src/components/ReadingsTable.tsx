import { useMemo } from 'react';

import { useNow } from '@/hooks/useNow';

import { EventIdCopy } from '@/components/EventIdCopy';
import { SensorReadingValue } from '@/components/SensorReadingValue';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import {
  formatAbsoluteTime,
  formatRelativeTime,
} from '@/lib/timeUtils';
import {
  getSensorColumnLabel,
  getSensorColumns,
  getSensorShortName,
  matchSensorColumn,
  sensorColumnKey,
  type SensorColumn,
} from '@/lib/weatherUtils';
import { cn } from '@/lib/utils';

export interface ReadingTableRow {
  id: string;
  timestamp?: number;
  readings: Array<{ type: string; value: string; model?: string }>;
  eventId?: string;
}

interface ReadingsTableProps {
  rows: ReadingTableRow[];
  sensorColumns?: SensorColumn[];
  /** `grid` for latest-reading cards; `events` for responsive event history. */
  layout?: 'grid' | 'events';
  className?: string;
  /** Shared ticking clock from the host page, so every timestamp agrees. */
  now?: Date;
}

/**
 * Colour for a row's relative timestamp by age: fresh readings pop in the
 * brand orange, recent ones stay neutral, old ones recede. Rows are sorted
 * newest-first, so the eye reads a freshness gradient top to bottom.
 */
function readingAgeClass(timestamp: number, now: Date): string {
  const ageSec = Math.max(0, now.getTime() / 1000 - timestamp);
  if (ageSec < 15 * 60) return 'text-orange-700';
  if (ageSec >= 60 * 60) return 'text-muted-foreground';
  return 'text-foreground';
}

function ReadingGrid({
  readings,
  className,
}: {
  readings: Array<{ type: string; value: string; model?: string }>;
  className?: string;
}) {
  const { formatSensorValue } = useWeatherFormatters();

  // Within one event, disambiguate same-type readings with their model.
  const typeCounts = new Map<string, number>();
  for (const reading of readings) {
    typeCounts.set(reading.type, (typeCounts.get(reading.type) ?? 0) + 1);
  }

  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3', className)}>
      {readings.map((reading, idx) => {
        const showModel =
          (typeCounts.get(reading.type) ?? 0) > 1 && reading.model?.trim();
        return (
          <div key={`${reading.type}-${reading.model ?? ''}-${idx}`}>
            <div className="mb-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              {showModel
                ? `${getSensorShortName(reading.type)} · ${reading.model}`
                : getSensorShortName(reading.type)}
            </div>
            <SensorReadingValue
              type={reading.type}
              value={reading.value}
              model={reading.model}
              formattedValue={formatSensorValue(reading.type, reading.value)}
              variant="stacked"
            />
          </div>
        );
      })}
    </div>
  );
}

function EventCards({ rows, now }: { rows: ReadingTableRow[]; now: Date }) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row, index) => (
        <article
          key={row.id}
          className={cn(
            'rounded-lg border border-border/60 p-3',
            index === 0 ? 'border-primary/25 bg-primary/5' : 'bg-card/40',
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            {row.timestamp !== undefined ? (
              <div>
                <div className={cn('font-medium', readingAgeClass(row.timestamp, now))}>
                  {formatRelativeTime(row.timestamp, now.getTime())}
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
  columns,
  now,
}: {
  rows: ReadingTableRow[];
  columns: SensorColumn[];
  now: Date;
}) {
  const { formatSensorValue } = useWeatherFormatters();

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <th className="py-2 pr-4 font-normal whitespace-nowrap">When</th>
            {columns.map((column) => (
              <th key={sensorColumnKey(column)} className="py-2 pr-4 font-normal whitespace-nowrap">
                {getSensorColumnLabel(column)}
              </th>
            ))}
            <th className="w-16 py-2 pl-2 font-normal text-center">Event</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border/40 last:border-b-0 hover:bg-muted/15',
                index === 0 && 'bg-primary/5',
              )}
            >
              <td className="py-2.5 pr-4 align-top whitespace-nowrap">
                {row.timestamp !== undefined ? (
                  <>
                    <div className={cn('font-medium', readingAgeClass(row.timestamp, now))}>
                      {formatRelativeTime(row.timestamp, now.getTime())}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {formatAbsoluteTime(row.timestamp)}
                    </div>
                  </>
                ) : (
                  '—'
                )}
              </td>
              {columns.map((column) => {
                const reading = row.readings.find((r) => matchSensorColumn(r, column));
                return (
                  <td
                    key={`${row.id}-${sensorColumnKey(column)}`}
                    className="py-2.5 pr-4 align-top whitespace-nowrap"
                  >
                    {reading ? (
                      <SensorReadingValue
                        type={reading.type}
                        value={reading.value}
                        model={reading.model}
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
  sensorColumns: fixedSensorColumns,
  layout = 'grid',
  className,
  now: sharedNow,
}: ReadingsTableProps) {
  // Fallback for pages that don't pass a clock; 1s cadence keeps "Xs ago" smooth.
  const ownNow = useNow(1000);
  const now = sharedNow ?? ownNow;
  const columns = useMemo(() => {
    if (fixedSensorColumns && fixedSensorColumns.length > 0) {
      return fixedSensorColumns;
    }
    return getSensorColumns(rows.map((row) => row.readings));
  }, [rows, fixedSensorColumns]);

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
      <EventCards rows={rows} now={now} />
      <EventTable rows={rows} columns={columns} now={now} />
    </div>
  );
}
