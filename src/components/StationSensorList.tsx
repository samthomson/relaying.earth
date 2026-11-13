import { Check, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  getSensorName,
  groupStationSensors,
  type WeatherStationMetadata,
} from '@/lib/weatherUtils';

interface StationSensorListProps {
  station: WeatherStationMetadata;
}

/** Physical sensors (grouped by hardware model) with a per-device status. */
export function StationSensorList({ station }: StationSensorListProps) {
  const groups = groupStationSensors(station);

  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground">No sensors declared.</p>;
  }

  return (
    <ul className="divide-y divide-border/40">
      {groups.map((group) => (
        <li
          key={group.model}
          className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-medium">{group.model}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {group.types.map((type) => getSensorName(type)).join(' · ')}
            </div>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              group.ok
                ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700'
                : 'border-destructive/40 bg-destructive/10 text-destructive',
            )}
            title={group.ok ? 'Reporting ok' : 'Fault reported'}
          >
            {group.ok ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <TriangleAlert className="h-3 w-3" aria-hidden />
            )}
            {group.ok ? 'OK' : 'Fault'}
          </span>
        </li>
      ))}
    </ul>
  );
}
