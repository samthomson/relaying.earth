import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import {
  WEATHER_STATION_LIST_KIND,
  parseStationList,
  type StationList,
} from '@/lib/weatherUtils';

/**
 * Fetch all station lists for a user
 */
export function useStationLists(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['stationLists', pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) return [];

      const events = await nostr.query(
        [
          {
            kinds: [WEATHER_STATION_LIST_KIND],
            authors: [pubkey],
          },
        ],
        { signal }
      );

      // Parse and filter valid lists
      const lists: StationList[] = [];
      for (const event of events) {
        const parsed = parseStationList(event);
        if (parsed) {
          lists.push(parsed);
        }
      }

      return lists;
    },
    enabled: !!pubkey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a specific station list by identifier
 */
export function useStationList(pubkey: string | undefined, identifier: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['stationList', pubkey, identifier],
    queryFn: async ({ signal }) => {
      if (!pubkey || !identifier) return null;

      const events = await nostr.query(
        [
          {
            kinds: [WEATHER_STATION_LIST_KIND],
            authors: [pubkey],
            '#d': [identifier],
            limit: 1,
          },
        ],
        { signal }
      );

      if (events.length === 0) return null;

      return parseStationList(events[0]);
    },
    enabled: !!pubkey && !!identifier,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to create or update a station list
 */
export function useCreateOrUpdateStationList() {
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      identifier: string;
      title?: string;
      description?: string;
      stations: string[];
    }) => {
      const { identifier, title, description, stations } = params;

      const tags: string[][] = [
        ['d', identifier],
        ['alt', `Weather station list: ${title || identifier} (${stations.length} stations)`],
      ];

      if (title) tags.push(['title', title]);
      if (description) tags.push(['description', description]);

      // Add station pubkeys
      for (const stationPubkey of stations) {
        tags.push(['p', stationPubkey]);
      }

      return new Promise<void>((resolve, reject) => {
        publishEvent(
          {
            kind: WEATHER_STATION_LIST_KIND,
            content: '',
            tags,
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
    },
    onSuccess: () => {
      // Invalidate station lists queries
      queryClient.invalidateQueries({ queryKey: ['stationLists'] });
      queryClient.invalidateQueries({ queryKey: ['stationList'] });
    },
  });
}

/**
 * Hook to delete a station list (publish empty replacement)
 */
export function useDeleteStationList() {
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (identifier: string) => {
      return new Promise<void>((resolve, reject) => {
        publishEvent(
          {
            kind: WEATHER_STATION_LIST_KIND,
            content: '',
            tags: [
              ['d', identifier],
              ['alt', 'Deleted weather station list'],
            ],
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      });
    },
    onSuccess: () => {
      // Invalidate station lists queries
      queryClient.invalidateQueries({ queryKey: ['stationLists'] });
      queryClient.invalidateQueries({ queryKey: ['stationList'] });
    },
  });
}
