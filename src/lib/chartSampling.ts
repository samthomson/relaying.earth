import type { ChartTimeRange } from '@/lib/chartUtils';

export interface ChartTimeBucket {
  since: number;
  until: number;
  /** X-axis position — bucket centre. */
  center: number;
}

export interface ChartSamplingConfig {
  seconds: number;
  bucketCount: number;
  bucketSeconds: number;
  label: string;
}

export const CHART_SAMPLING_CONFIG: Record<ChartTimeRange, ChartSamplingConfig> = {
  '1h': {
    seconds: 3600,
    bucketCount: 60,
    bucketSeconds: 60,
    label: 'Last hour',
  },
  '24h': {
    seconds: 86400,
    bucketCount: 288,
    bucketSeconds: 5 * 60,
    label: 'Last 24h',
  },
  '7d': {
    seconds: 604800,
    bucketCount: 168,
    bucketSeconds: 3600,
    label: 'Last 7 days',
  },
};

/** Build disjoint time buckets ending at `until`, oldest first. */
export function buildChartTimeBuckets(
  range: ChartTimeRange,
  until: number,
): ChartTimeBucket[] {
  const { bucketCount, bucketSeconds } = CHART_SAMPLING_CONFIG[range];
  const buckets: ChartTimeBucket[] = [];

  for (let index = bucketCount - 1; index >= 0; index -= 1) {
    const bucketUntil = until - index * bucketSeconds;
    const bucketSince = bucketUntil - bucketSeconds;
    buckets.push({
      since: bucketSince,
      until: bucketUntil,
      center: bucketSince + bucketSeconds / 2,
    });
  }

  return buckets;
}

export const CHART_FILTER_CHUNK_SIZE = 50;
