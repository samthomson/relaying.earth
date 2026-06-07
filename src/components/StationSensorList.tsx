import { Badge } from '@/components/ui/badge';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';
import { getSensorName } from '@/lib/weatherUtils';

interface StationSensorListProps {
  station: WeatherStationMetadata;
}

export function StationSensorList({ station }: StationSensorListProps) {
  if (station.sensors.length === 0) {
    return <p className="text-xs text-muted-foreground">No sensors declared.</p>;
  }

  return (
    <ul className="divide-y divide-border/40">
      {station.sensors.map((sensor, idx) => {
        const status = station.sensorStatuses.find(
          (entry) => entry.type === sensor.type && entry.model === sensor.model,
        );
        const ok = !status || status.status === 'ok';

        return (
          <li
            key={`${sensor.type}-${sensor.model}-${idx}`}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{getSensorName(sensor.type)}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {sensor.model}
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                ok
                  ? 'shrink-0 border-primary/30 bg-primary/10 text-primary'
                  : 'shrink-0 border-destructive/40 bg-destructive/10 text-destructive'
              }
            >
              {ok ? 'OK' : status?.status ?? 'Fault'}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
