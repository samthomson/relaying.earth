import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import {
  WEATHER_READING_KIND,
  parseWeatherReading,
} from '@/lib/weatherUtils';

/** Stations with a kind:4223 reading within this window count as online. */
export const STATION_ONLINE_WINDOW_SECONDS = 3600;

/**
 * Count distinct stations that published a reading within the online window.
 */
export function useOnlineStationCount() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['onlineStationCount', STATION_ONLINE_WINDOW_SECONDS],
    queryFn: async ({ signal }) => {
      const since =
        Math.floor(Date.now() / 1000) - STATION_ONLINE_WINDOW_SECONDS;

      const events = await nostr.query(
        [{ kinds: [WEATHER_READING_KIND], since, limit: 500 }],
        { signal },
      );

      const pubkeys = new Set<string>();
      for (const event of events) {
        const parsed = parseWeatherReading(event);
        if (parsed) pubkeys.add(parsed.pubkey);
      }

      return pubkeys.size;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
