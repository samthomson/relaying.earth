import { useMemo, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SunDayArc } from '@/components/SunDayArc';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';
import {
  getStationCoordinates,
  getStationTimeInfo,
} from '@/lib/stationTime';
import { useNow } from '@/hooks/useNow';

interface StationLocalTimePanelProps {
  station: WeatherStationMetadata;
}

export function StationLocalTimePanel({ station }: StationLocalTimePanelProps) {
  const [showViewerTime, setShowViewerTime] = useState(true);
  const now = useNow();
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const coords = getStationCoordinates(station);

  const timeInfo = useMemo(() => {
    if (!coords) return null;
    return getStationTimeInfo(now, coords.lat, coords.lng);
  }, [coords, now]);

  if (!coords) {
    return (
      <p className="text-xs text-muted-foreground">
        Location time unavailable — station has no geohash or coordinates.
      </p>
    );
  }

  if (!timeInfo) {
    return <Skeleton className="h-24 w-full" />;
  }

  const { solar } = timeInfo;
  const sunLabel = solar.polarDay
    ? 'Polar day'
    : solar.polarNight
      ? 'Polar night'
      : timeInfo.isDaytime
        ? 'Daytime'
        : 'Nighttime';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={
            timeInfo.isDaytime
              ? 'border-amber-300/50 bg-amber-100/40 text-amber-800'
              : 'border-indigo-300/40 bg-indigo-100/30 text-indigo-900'
          }
        >
          {timeInfo.isDaytime ? (
            <Sun className="mr-1 h-3 w-3" aria-hidden />
          ) : (
            <Moon className="mr-1 h-3 w-3" aria-hidden />
          )}
          {sunLabel}
        </Badge>
        <button
          type="button"
          onClick={() => setShowViewerTime((current) => !current)}
          className="text-[11px] text-primary hover:underline"
        >
          {showViewerTime ? 'Hide your time' : 'Show your time'}
        </button>
      </div>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Station time</span>
        <div className="text-right">
          <div className="font-medium tabular-nums">{timeInfo.stationClock}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{timeInfo.timeZoneLabel}</div>
        </div>
      </div>

      {showViewerTime && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Your time</span>
          <div className="text-right">
            <div className="font-medium tabular-nums">{timeInfo.viewerClock}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {timeInfo.viewerTimezone}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border/40 pt-3">
        <SunDayArc
          now={now}
          solar={solar}
          timeZone={timeInfo.timeZone}
          sunriseCountdown={timeInfo.sunriseCountdown}
          sunsetCountdown={timeInfo.sunsetCountdown}
          showViewerTime={showViewerTime}
          viewerTimeZone={viewerTimeZone}
        />
      </div>
    </div>
  );
}
