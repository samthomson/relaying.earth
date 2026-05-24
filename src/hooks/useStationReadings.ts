import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { WEATHER_READING_KIND, parseWeatherReading, type WeatherReading } from '@/lib/weatherUtils';

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
