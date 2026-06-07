import type { WeatherReading } from '@/lib/weatherUtils';

export interface ChartPoint {
  timestamp: number;
  value: number;
}

export type ChartTimeRange = '1h' | '24h' | '7d';

export interface ChartTimeRangeConfig {
  seconds: number;
  /** Relay fetch limit — sized for ~one bucket per interval in the window. */
  readingLimit: number;
  bucketSeconds: number;
  label: string;
}

export const CHART_TIME_RANGE_CONFIG: Record<ChartTimeRange, ChartTimeRangeConfig> = {
  '1h': { seconds: 3600, readingLimit: 90, bucketSeconds: 60, label: 'Last hour' },
  '24h': { seconds: 86400, readingLimit: 60, bucketSeconds: 1800, label: 'Last 24h' },
  '7d': { seconds: 604800, readingLimit: 180, bucketSeconds: 3600, label: 'Last 7 days' },
};

/**
 * Keep the latest reading in each time bucket for a single sensor type.
 */
export function downsampleChartPoints(
  readings: WeatherReading[],
  sensorType: string,
  since: number,
  bucketSeconds: number,
  toValue: (type: string, value: string) => number | null,
): ChartPoint[] {
  const buckets = new Map<number, ChartPoint>();

  for (const reading of readings) {
    if (reading.timestamp < since) continue;
    const point = reading.readings.find((r) => r.type === sensorType);
    if (!point) continue;
    const value = toValue(sensorType, point.value);
    if (value === null || Number.isNaN(value)) continue;

    const bucket = Math.floor(reading.timestamp / bucketSeconds) * bucketSeconds;
    const existing = buckets.get(bucket);
    if (!existing || reading.timestamp > existing.timestamp) {
      buckets.set(bucket, { timestamp: reading.timestamp, value });
    }
  }

  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function formatChartAxisTick(timestamp: number, range: ChartTimeRange): string {
  const date = new Date(timestamp * 1000);
  if (range === '7d') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
