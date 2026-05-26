import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import {
  WEATHER_READING_KIND,
  parseWeatherReading,
  type WeatherReading,
} from '@/lib/weatherUtils';

interface UseRecentReadingsOptions {
  /** Maximum number of events to fetch. */
  limit?: number;
  /** Only fetch readings since this unix timestamp. */
  since?: number;
  /** Restrict to specific station pubkeys. Useful for "my stations" feeds. */
  authors?: string[];
}

/**
 * Fetch recent weather readings across the entire network (or a curated set).
 *
 * Unlike `useStationReadings` which targets a single station's pubkey, this
 * hook is intentionally broad — it powers the homepage live ticker and the
 * "recent activity" feeds.
 */
export function useRecentReadings(options: UseRecentReadingsOptions = {}) {
  const { nostr } = useNostr();
  const { limit = 30, since, authors } = options;

  return useQuery({
    queryKey: ['recentReadings', limit, since, authors],
    queryFn: async ({ signal }) => {
      const filter: {
        kinds: number[];
        limit: number;
        since?: number;
        authors?: string[];
      } = {
        kinds: [WEATHER_READING_KIND],
        limit,
      };

      if (since) filter.since = since;
      if (authors && authors.length > 0) filter.authors = authors;

      const events = await nostr.query([filter], { signal });

      const readings: WeatherReading[] = [];
      for (const event of events) {
        const parsed = parseWeatherReading(event);
        if (parsed) readings.push(parsed);
      }
      readings.sort((a, b) => b.timestamp - a.timestamp);
      return readings;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
