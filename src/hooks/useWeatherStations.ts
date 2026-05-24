import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import {
  WEATHER_STATION_METADATA_KIND,
  parseStationMetadata,
  type WeatherStationMetadata,
} from '@/lib/weatherUtils';

interface UseWeatherStationsOptions {
  geohash?: string;
  authors?: string[];
  limit?: number;
}

/**
 * Fetch all weather stations or filter by geohash/authors
 */
export function useWeatherStations(options: UseWeatherStationsOptions = {}) {
  const { nostr } = useNostr();
  const { geohash, authors, limit = 200 } = options;

  return useQuery({
    queryKey: ['weatherStations', geohash, authors],
    queryFn: async ({ signal }) => {
      const filters: Array<{
        kinds: number[];
        '#g'?: string[];
        authors?: string[];
        limit: number;
      }> = [
        {
          kinds: [WEATHER_STATION_METADATA_KIND],
          limit,
        },
      ];

      // Add optional filters
      if (geohash) {
        filters[0]['#g'] = [geohash];
      }
      if (authors && authors.length > 0) {
        filters[0].authors = authors;
      }

      const events = await nostr.query(filters, { signal });

      // Parse and filter valid station metadata
      const stations: WeatherStationMetadata[] = [];
      for (const event of events) {
        const parsed = parseStationMetadata(event);
        if (parsed) {
          stations.push(parsed);
        }
      }

      return stations;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single weather station by pubkey
 */
export function useWeatherStation(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['weatherStation', pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) return null;

      const events = await nostr.query(
        [
          {
            kinds: [WEATHER_STATION_METADATA_KIND],
            authors: [pubkey],
            limit: 1,
          },
        ],
        { signal }
      );

      if (events.length === 0) return null;

      return parseStationMetadata(events[0]);
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
