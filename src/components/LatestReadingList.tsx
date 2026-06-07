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
  readings: Array<{ type: string; value: string }>;
}

/** Vertical list — readable on narrow panels and mobile. */
export function LatestReadingList({ readings }: LatestReadingListProps) {
  const { formatSensorValue } = useWeatherFormatters();

  return (
    <ul className="divide-y divide-border/40">
      {readings.map((reading, idx) => (
        <li
          key={`${reading.type}-${idx}`}
          className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
        >
          <span className="text-sm text-muted-foreground">{getSensorName(reading.type)}</span>
          <SensorReadingValue
            type={reading.type}
            value={reading.value}
            formattedValue={formatSensorValue(reading.type, reading.value)}
            variant="inline"
          />
        </li>
      ))}
    </ul>
  );
}
