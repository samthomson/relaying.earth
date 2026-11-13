import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

import { buildChartTimeBuckets } from '@/lib/chartSampling';
import type { ChartTimeRange } from '@/lib/chartUtils';
import type { ChartSampledReading } from '@/hooks/useStationChartReadings';
import { WEATHER_READING_KIND, parseWeatherReading, type WeatherReading } from '@/lib/weatherUtils';

/**
 * Subscribe to new readings from `pubkey` and merge them into every matching
 * query cache entry (per-station readings and chart samples) as they arrive.
 */
function useLiveStationReadings(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pubkey) return;

    const controller = new AbortController();
    // Only stream events from now on; history comes from the queries.
    const since = Math.floor(Date.now() / 1000);

    void (async () => {
      try {
        for await (const msg of nostr.req(
          [{ kinds: [WEATHER_READING_KIND], authors: [pubkey], since }],
          { signal: controller.signal },
        )) {
          if (msg[0] !== 'EVENT') continue;
          const parsed = parseWeatherReading(msg[2]);
          if (!parsed) continue;

          // Per-station reading caches: ['stationReadings', pubkey, since?, limit]
          queryClient.setQueriesData<WeatherReading[]>(
            { queryKey: ['stationReadings', pubkey] },
            (old) => {
              if (!old || old.some((reading) => reading.event.id === parsed.event.id)) {
                return old;
              }
              return [...old, parsed]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, Math.max(old.length, 1));
            },
          );

          // Chart caches: ['stationChartReadings', pubkey, range, until] —
          // place the event in its bucket so the newest point extends the chart.
          for (const query of queryClient
            .getQueryCache()
            .findAll({ queryKey: ['stationChartReadings', pubkey] })) {
            const [, , timeRange, until] = query.queryKey as [
              string,
              string,
              ChartTimeRange,
              number,
            ];
            const bucket = buildChartTimeBuckets(timeRange, until).find(
              (b) => parsed.timestamp >= b.since && parsed.timestamp < b.until,
            );
            if (!bucket) continue;

            queryClient.setQueryData<ChartSampledReading[]>(
              query.queryKey,
              (old) => {
                if (!old || old.some((sample) => sample.event.id === parsed.event.id)) {
                  return old;
                }
                const sample: ChartSampledReading = { ...parsed, chartTimestamp: bucket.center };
                const index = old.findIndex((s) => s.chartTimestamp === bucket.center);
                if (index === -1) {
                  return [...old, sample].sort((a, b) => a.chartTimestamp - b.chartTimestamp);
                }
                if (sample.timestamp < old[index].timestamp) return old;
                const next = [...old];
                next[index] = sample;
                return next;
              },
            );
          }
        }
      } catch {
        // Aborted on unmount, or the subscription dropped — the polling
        // refetchInterval remains as a safety net.
      }
    })();

    return () => controller.abort();
  }, [nostr, pubkey, queryClient]);
}

interface UseStationReadingsOptions {
  pubkey: string | undefined;
  since?: number; // Unix timestamp
  limit?: number;
}

/**
 * Fetch weather readings from a specific station
 */
export function useStationReadings(options: UseStationReadingsOptions) {
  const { nostr } = useNostr();
  const { pubkey, since, limit = 50 } = options;

  // Stream new readings into the cache while this station is mounted.
  useLiveStationReadings(pubkey);
  return useQuery({
    queryKey: ['stationReadings', pubkey, since, limit],
    queryFn: async ({ signal }) => {
      if (!pubkey) return [];

      const filters: Array<{
        kinds: number[];
        authors: string[];
        since?: number;
        limit: number;
      }> = [
        {
          kinds: [WEATHER_READING_KIND],
          authors: [pubkey],
          limit,
        },
      ];

      if (since) {
        filters[0].since = since;
      }

      const events = await nostr.query(filters, { signal });

      // Parse and filter valid readings
      const readings: WeatherReading[] = [];
      for (const event of events) {
        const parsed = parseWeatherReading(event);
        if (parsed) {
          readings.push(parsed);
        }
      }

      // Sort by timestamp descending (most recent first)
      readings.sort((a, b) => b.timestamp - a.timestamp);

      return readings;
    },
    enabled: !!pubkey,
    staleTime: 1 * 60 * 1000, // 1 minute (readings change frequently)
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
  });
}

/**
 * Fetch the most recent reading from a station
 */
export function useLatestReading(pubkey: string | undefined) {
  const { data: readings, ...rest } = useStationReadings({ pubkey, limit: 1 });
  return {
    data: readings?.[0] || null,
    ...rest,
  };
}
