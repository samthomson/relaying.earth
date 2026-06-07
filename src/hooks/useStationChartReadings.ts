import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

import type { NostrEvent } from '@nostrify/nostrify';
import type { NostrFilter } from '@nostrify/types';

import {
  buildChartTimeBuckets,
  CHART_FILTER_CHUNK_SIZE,
  CHART_SAMPLING_CONFIG,
  type ChartTimeBucket,
} from '@/lib/chartSampling';
import type { ChartTimeRange } from '@/lib/chartUtils';
import {
  WEATHER_READING_KIND,
  parseWeatherReading,
  type WeatherReading,
} from '@/lib/weatherUtils';

export interface ChartSampledReading extends WeatherReading {
  /** Bucket centre used for chart X-axis positioning. */
  chartTimestamp: number;
}

interface UseStationChartReadingsOptions {
  pubkey: string | undefined;
  timeRange: ChartTimeRange;
  until: number;
}

function assignEventsToBuckets(
  events: NostrEvent[],
  buckets: ChartTimeBucket[],
  pubkey: string,
): ChartSampledReading[] {
  const readings: ChartSampledReading[] = [];

  for (const bucket of buckets) {
    const match = events
      .filter(
        (event) =>
          event.created_at >= bucket.since && event.created_at < bucket.until,
      )
      .sort((a, b) => b.created_at - a.created_at)[0];

    if (!match) continue;

    const parsed = parseWeatherReading(match);
    if (!parsed || parsed.pubkey !== pubkey) continue;

    readings.push({
      ...parsed,
      chartTimestamp: bucket.center,
    });
  }

  return readings.sort((a, b) => a.chartTimestamp - b.chartTimestamp);
}

async function queryFiltersInChunks(
  queryFn: (filters: NostrFilter[]) => Promise<NostrEvent[]>,
  filters: NostrFilter[],
  signal?: AbortSignal,
): Promise<NostrEvent[]> {
  const results: NostrEvent[] = [];

  for (let offset = 0; offset < filters.length; offset += CHART_FILTER_CHUNK_SIZE) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    const chunk = filters.slice(offset, offset + CHART_FILTER_CHUNK_SIZE);
    const events = await queryFn(chunk);
    results.push(...events);
  }

  return results;
}

/**
 * Fetch one reading per chart bucket using targeted Nostr filters
 * (e.g. 96 × 15-minute windows for 24h, 168 × 1-hour windows for 7d).
 */
export function useStationChartReadings({
  pubkey,
  timeRange,
  until,
}: UseStationChartReadingsOptions) {
  const { nostr } = useNostr();
  const buckets = buildChartTimeBuckets(timeRange, until);

  return useQuery({
    queryKey: ['stationChartReadings', pubkey, timeRange, until],
    queryFn: async ({ signal }) => {
      if (!pubkey) return [];

      const filters: NostrFilter[] = buckets.map((bucket) => ({
        kinds: [WEATHER_READING_KIND],
        authors: [pubkey],
        since: bucket.since,
        until: bucket.until,
        limit: 1,
      }));

      const events = await queryFiltersInChunks(
        (chunk) => nostr.query(chunk, { signal }),
        filters,
        signal,
      );

      return assignEventsToBuckets(events, buckets, pubkey);
    },
    enabled: !!pubkey,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}

export function getChartWindowSeconds(range: ChartTimeRange): number {
  return CHART_SAMPLING_CONFIG[range].seconds;
}
