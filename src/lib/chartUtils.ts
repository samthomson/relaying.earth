import type { WeatherReading } from '@/lib/weatherUtils';
import { rainRawToLevel } from '@/lib/sensorInterpretations';
import { CHART_SAMPLING_CONFIG, type ChartSamplingConfig } from '@/lib/chartSampling';

export interface ChartPoint {
  timestamp: number;
  value: number;
}

export type MultiChartPoint = {
  timestamp: number;
} & Record<string, number | undefined>;

export type ChartTimeRange = '1h' | '24h' | '7d';

/** @deprecated Use CHART_SAMPLING_CONFIG — kept for seconds/label lookups. */
export type ChartTimeRangeConfig = ChartSamplingConfig & {
  readingLimit?: number;
  bucketSeconds: number;
};

export const CHART_TIME_RANGE_CONFIG: Record<ChartTimeRange, ChartTimeRangeConfig> = {
  '1h': { ...CHART_SAMPLING_CONFIG['1h'], bucketSeconds: CHART_SAMPLING_CONFIG['1h'].bucketSeconds },
  '24h': { ...CHART_SAMPLING_CONFIG['24h'], bucketSeconds: CHART_SAMPLING_CONFIG['24h'].bucketSeconds },
  '7d': { ...CHART_SAMPLING_CONFIG['7d'], bucketSeconds: CHART_SAMPLING_CONFIG['7d'].bucketSeconds },
};

export { CHART_SAMPLING_CONFIG };

export const CHART_SENSOR_COLORS: Record<string, string> = {
  temp: '#ea580c',
  humidity: '#0284c7',
  pressure: '#7c3aed',
  light: '#ca8a04',
  rain: '#1d4ed8',
  pm1: '#059669',
  pm25: '#db2777',
  pm10: '#9333ea',
  co2: '#57534e',
};

const FALLBACK_CHART_COLORS = [
  '#ea580c',
  '#7c3aed',
  '#1d4ed8',
  '#059669',
  '#db2777',
  '#ca8a04',
];

export function getChartSensorColor(type: string, index = 0): string {
  return CHART_SENSOR_COLORS[type] ?? FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length];
}

export function toChartNumericValue(
  type: string,
  value: string,
  toDisplayNumber: (type: string, value: string) => number | null,
): number | null {
  if (type === 'rain') {
    const raw = Number.parseFloat(value);
    if (!Number.isFinite(raw)) return null;
    return rainRawToLevel(raw);
  }
  return toDisplayNumber(type, value);
}

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
      buckets.set(bucket, { timestamp: bucket, value });
    }
  }

  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/** Merge series for chart display. Supports pre-sampled bucket readings. */
export function buildMultiSeriesChartData(
  readings: Array<WeatherReading & { chartTimestamp?: number }>,
  sensorTypes: string[],
  since: number,
  bucketSeconds: number,
  toDisplayNumber: (type: string, value: string) => number | null,
): MultiChartPoint[] {
  const toValue = (type: string, value: string) =>
    toChartNumericValue(type, value, toDisplayNumber);

  const isSampled = readings.some((reading) => reading.chartTimestamp !== undefined);
  if (isSampled) {
    const merged = new Map<number, MultiChartPoint>();
    for (const reading of readings) {
      const timestamp = reading.chartTimestamp ?? reading.timestamp;
      if (timestamp < since) continue;
      const row = merged.get(timestamp) ?? { timestamp };
      for (const sensorType of sensorTypes) {
        const point = reading.readings.find((entry) => entry.type === sensorType);
        if (!point) continue;
        const value = toValue(sensorType, point.value);
        if (value === null || Number.isNaN(value)) continue;
        row[sensorType] = value;
      }
      merged.set(timestamp, row);
    }
    return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);
  }

  const merged = new Map<number, MultiChartPoint>();

  for (const sensorType of sensorTypes) {
    const points = downsampleChartPoints(
      readings,
      sensorType,
      since,
      bucketSeconds,
      toValue,
    );
    for (const point of points) {
      const row = merged.get(point.timestamp) ?? { timestamp: point.timestamp };
      row[sensorType] = point.value;
      merged.set(point.timestamp, row);
    }
  }

  return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function formatChartAxisTick(
  timestamp: number,
  range: ChartTimeRange,
  timeZone?: string,
): string {
  const date = new Date(timestamp * 1000);
  if (range === '7d') {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone,
    });
  }
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

export function usesRainStateAxis(sensorType: string): boolean {
  return sensorType === 'rain';
}

export function getChartYAxisUnit(
  sensorType: string,
  getSensorUnit: (type: string) => string,
): string {
  if (sensorType === 'rain') return 'State';
  return getSensorUnit(sensorType);
}
