import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartSampledReading } from '@/hooks/useStationChartReadings';
import type { WeatherReading } from '@/lib/weatherUtils';
import { getSensorName } from '@/lib/weatherUtils';
import { formatRainChartTick } from '@/lib/sensorInterpretations';
import {
  buildMultiSeriesChartData,
  CHART_TIME_RANGE_CONFIG,
  formatChartAxisTick,
  getChartSensorColor,
  getChartYAxisUnit,
  usesRainStateAxis,
  type ChartTimeRange,
} from '@/lib/chartUtils';
import { formatAbsoluteTime } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface StationHistoryChartProps {
  readings: ChartSampledReading[] | WeatherReading[] | undefined;
  readingsLoading: boolean;
  timeRange: ChartTimeRange;
  since: number;
  until: number;
  sensorTypes: string[];
  formatDisplayNumber: (type: string, displayNumber: number) => string;
  getSensorUnit: (type: string) => string;
  toDisplayNumber: (type: string, value: string) => number | null;
  onTimeRangeChange: (range: ChartTimeRange) => void;
}

export function StationHistoryChart({
  readings,
  readingsLoading,
  timeRange,
  since,
  until,
  sensorTypes,
  formatDisplayNumber,
  getSensorUnit,
  toDisplayNumber,
  onTimeRangeChange,
}: StationHistoryChartProps) {
  const defaultSelection = useMemo(() => {
    if (sensorTypes.length === 0) return [];
    return [sensorTypes.includes('temp') ? 'temp' : sensorTypes[0]];
  }, [sensorTypes]);

  const [selection, setSelection] = useState<string[]>([]);

  const activeSensors = useMemo(() => {
    const base = selection.length > 0 ? selection : defaultSelection;
    const valid = base.filter((type) => sensorTypes.includes(type));
    return valid.length > 0 ? valid : defaultSelection;
  }, [selection, defaultSelection, sensorTypes]);

  const chartData = useMemo(() => {
    if (!readings || activeSensors.length === 0) return [];
    return buildMultiSeriesChartData(
      readings,
      activeSensors,
      since,
      CHART_TIME_RANGE_CONFIG[timeRange].bucketSeconds,
      toDisplayNumber,
    );
  }, [readings, activeSensors, since, timeRange, toDisplayNumber]);

  const toggleSensor = (type: string) => {
    setSelection((current) => {
      const base = current.length > 0 ? current : defaultSelection;
      if (base.includes(type)) {
        if (base.length === 1) return base;
        return base.filter((entry) => entry !== type);
      }
      return [...base, type];
    });
  };

  const chartMargin = useMemo(() => {
    const leftAxes = activeSensors.filter((_, index) => index % 2 === 0).length;
    const rightAxes = activeSensors.length - leftAxes;
    return {
      top: 8,
      bottom: 0,
      left: 8 + leftAxes * 44,
      right: 8 + rightAxes * 44,
    };
  }, [activeSensors]);

  return (
    <Card className="bg-card/60">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            History
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-0.5">
            {(Object.keys(CHART_TIME_RANGE_CONFIG) as ChartTimeRange[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onTimeRangeChange(key)}
                className={cn(
                  'rounded px-2 py-1 text-xs transition-colors',
                  timeRange === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {sensorTypes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {sensorTypes.map((type) => {
              const isActive = activeSensors.includes(type);
              const color = getChartSensorColor(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleSensor(type)}
                  aria-pressed={isActive}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                    isActive
                      ? 'bg-background text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                  )}
                  style={
                    isActive
                      ? { borderColor: color, boxShadow: `inset 0 0 0 1px ${color}22` }
                      : undefined
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: isActive ? color : 'var(--border)' }}
                    aria-hidden
                  />
                  {getSensorName(type)}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-2 text-[11px] text-muted-foreground">
          Toggle sensors to compare. Rain chart uses derived states (Dry → Heavy).
        </p>

        <div className="mt-4">
          {readingsLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : activeSensors.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
              No readings in the selected window.
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
              No data for the selected sensors in this window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={chartMargin}>
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="var(--border)"
                  opacity={0.6}
                  vertical={false}
                />
                <XAxis
                  type="number"
                  dataKey="timestamp"
                  domain={[since, until]}
                  scale="time"
                  tickFormatter={(ts) => formatChartAxisTick(Number(ts), timeRange)}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  minTickGap={48}
                />
                {activeSensors.map((type, index) => {
                  const isRain = usesRainStateAxis(type);
                  const color = getChartSensorColor(type);
                  const orientation = index % 2 === 0 ? 'left' : 'right';
                  const sideIndex = Math.floor(index / 2);
                  return (
                    <YAxis
                      key={type}
                      yAxisId={type}
                      orientation={orientation}
                      domain={isRain ? [0, 4] : ['auto', 'auto']}
                      ticks={isRain ? [0, 1, 2, 3, 4] : undefined}
                      tickFormatter={isRain ? formatRainChartTick : undefined}
                      tick={{ fill: color, fontSize: 10 }}
                      axisLine={{ stroke: color, strokeOpacity: 0.65 }}
                      tickLine={false}
                      width={42}
                      offset={sideIndex * 48}
                      label={{
                        value: getChartYAxisUnit(type, getSensorUnit),
                        angle: orientation === 'left' ? -90 : 90,
                        position: orientation === 'left' ? 'insideLeft' : 'insideRight',
                        style: {
                          fill: color,
                          fontSize: 10,
                        },
                      }}
                    />
                  );
                })}
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => formatAbsoluteTime(Number(label))}
                  formatter={(value, name) => {
                    const type = String(name);
                    const numeric =
                      typeof value === 'number' ? value : Number.parseFloat(String(value));
                    if (!Number.isFinite(numeric)) return ['—', getSensorName(type)];
                    if (type === 'rain') {
                      return [formatRainChartTick(numeric), getSensorName(type)];
                    }
                    return [
                      formatDisplayNumber(type, numeric),
                      getSensorName(type),
                    ];
                  }}
                  itemSorter={(item) => activeSensors.indexOf(String(item.dataKey))}
                />
                {activeSensors.length > 1 && (
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    content={() => (
                      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                        {activeSensors.map((type) => (
                          <li
                            key={type}
                            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                          >
                            <span
                              className="h-0.5 w-3 rounded-full"
                              style={{ backgroundColor: getChartSensorColor(type) }}
                              aria-hidden
                            />
                            {getSensorName(type)}
                          </li>
                        ))}
                      </ul>
                    )}
                  />
                )}
                {activeSensors.map((type) => (
                  <Line
                    key={type}
                    yAxisId={type}
                    type="monotone"
                    dataKey={type}
                    name={type}
                    stroke={getChartSensorColor(type)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 4, fill: getChartSensorColor(type) }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
