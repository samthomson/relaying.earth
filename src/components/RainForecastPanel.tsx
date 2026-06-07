import { useMemo } from 'react';
import { CloudRain } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RainForecastGuide } from '@/components/RainForecastGuide';
import type { WeatherReading } from '@/lib/weatherUtils';
import { calculateRainForecast } from '@/lib/rainForecast';
import { PRESSURE_TENDENCY_LABELS } from '@/lib/zambretti';
import { cn } from '@/lib/utils';

interface RainForecastPanelProps {
  readings: WeatherReading[] | undefined;
  readingsLoading: boolean;
  hasPressureSensor: boolean;
  lat?: number;
}

function chanceTone(percent: number): string {
  if (percent >= 70) return 'text-sky-700';
  if (percent >= 35) return 'text-amber-700';
  return 'text-emerald-700';
}

export function RainForecastPanel({
  readings,
  readingsLoading,
  hasPressureSensor,
  lat,
}: RainForecastPanelProps) {
  const forecast = useMemo(
    () => (readings ? calculateRainForecast(readings, lat) : null),
    [readings, lat],
  );

  if (!hasPressureSensor) return null;

  return (
    <Card className="bg-card/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
            <CloudRain className="h-3.5 w-3.5 text-primary" />
            Rain outlook
          </div>
          <RainForecastGuide />
        </div>

        {readingsLoading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : !forecast ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Waiting for pressure readings…
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div
                  className={cn(
                    'font-display text-4xl font-semibold leading-none',
                    chanceTone(forecast.chancePercent),
                  )}
                >
                  {forecast.chancePercent}%
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Chance of rain soon</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs">
                  {forecast.zambrettiForecast}
                </span>
                <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                  {PRESSURE_TENDENCY_LABELS[forecast.pressureTendency]}
                  {forecast.pressureDelta3h !== null &&
                    ` · ${forecast.pressureDelta3h > 0 ? '+' : ''}${forecast.pressureDelta3h.toFixed(1)} hPa/3h`}
                </span>
                {forecast.currentLabel && (
                  <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs">
                    Sensor: {forecast.currentLabel}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{forecast.summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
