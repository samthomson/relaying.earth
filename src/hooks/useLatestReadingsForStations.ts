import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import {
  WEATHER_READING_KIND,
  parseWeatherReading,
  type WeatherReading,
} from '@/lib/weatherUtils';

export type LatestReadingsByPubkey = Record<string, WeatherReading>;

/**
 * Fetch the most recent kind:4223 reading for each station in one relay round-trip.
 * Uses one filter per author (limit 1) batched into a single `nostr.query` call.
 */
export function useLatestReadingsForStations(pubkeys: string[]) {
  const { nostr } = useNostr();

  const sortedPubkeys = useMemo(
    () => [...new Set(pubkeys)].sort(),
    [pubkeys],
  );

  return useQuery({
    queryKey: ['latestReadingsForStations', sortedPubkeys],
    queryFn: async ({ signal }) => {
      if (sortedPubkeys.length === 0) return {};

      const filters = sortedPubkeys.map((pubkey) => ({
        kinds: [WEATHER_READING_KIND],
        authors: [pubkey],
        limit: 1,
      }));

      const events = await nostr.query(filters, { signal });

      const byPubkey: LatestReadingsByPubkey = {};
      for (const event of events) {
        const parsed = parseWeatherReading(event);
        if (parsed) {
          byPubkey[parsed.pubkey] = parsed;
        }
      }

      return byPubkey;
    },
    enabled: sortedPubkeys.length > 0,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
