import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { parseBlossomServerList } from '@/lib/appBlossom';

/**
 * NostrSync — pulls a few non-content user preferences off the Nostr network
 * when the user logs in.
 *
 * Currently syncs:
 *  - BUD-03 Blossom server list (kind 10063)
 *
 * NIP-65 relay-list (kind 10002) sync is intentionally NOT performed here.
 * Relay choice is treated as a local-only setting, edited via the relay
 * settings dialog, so the user's UI state can't be silently overwritten by
 * something they previously published.
 */
export function NostrSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();

  useEffect(() => {
    if (!user) return;

    const syncBlossomServersFromNostr = async () => {
      try {
        const events = await nostr.query(
          [{ kinds: [10063], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) },
        );

        if (events.length > 0) {
          const event = events[0];

          if (event.created_at > config.blossomServerMetadata.updatedAt) {
            const fetchedServers = parseBlossomServerList(event);

            if (fetchedServers.length > 0) {
              console.log('Syncing Blossom server list from Nostr:', fetchedServers);
              updateConfig((current) => ({
                ...current,
                blossomServerMetadata: {
                  servers: fetchedServers,
                  updatedAt: event.created_at,
                },
              }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync Blossom servers from Nostr:', error);
      }
    };

    syncBlossomServersFromNostr();
  }, [user, config.blossomServerMetadata.updatedAt, nostr, updateConfig]);

  return null;
}
