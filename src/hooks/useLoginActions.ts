import { useNostr } from '@nostrify/react';
import {
  NLogin,
  type NostrConnectParams,
  type NostrConnectStatus,
  useNostrLogin,
} from '@nostrify/react/login';
import { useAppContext } from '@/hooks/useAppContext';
import { NIP46_RELAYS, WEATHER_RELAY_URL } from '@/lib/appRelays';

// NOTE: This file should not be edited except for adding new login methods.

export type { NostrConnectParams, NostrConnectStatus };
export { generateNostrConnectParams, generateNostrConnectURI } from '@nostrify/react/login';

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();
  const { config } = useAppContext();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
    },
    // Login via nostrconnect:// (client-initiated NIP-46)
    // The client displays a QR code and waits for the remote signer to connect.
    //
    // `onStatus` is forwarded from @nostrify/react so the UI can render
    // live progress through the handshake phases — see NostrConnectStatus.
    async nostrconnect(
      params: NostrConnectParams,
      signal?: AbortSignal,
      onStatus?: (status: NostrConnectStatus) => void,
    ): Promise<void> {
      const login = await NLogin.fromNostrConnect(params, nostr, { signal, onStatus });
      addLogin(login);
    },
    // Relays embedded in the nostrconnect QR — both this client and the remote
    // signer (Amber, etc.) use them for the NIP-46 handshake. Separate from
    // bunker:// URIs, where the signer app picks its own relay(s).
    //
    // User-enabled write relays are included (minus the weather relay, which
    // blocks kind 24133). Known general-purpose relays are always added so
    // the handshake works even on a fresh install.
    getRelayUrls(): string[] {
      const userRelays = config.relayMetadata.relays
        .filter((r) => r.write && r.url !== WEATHER_RELAY_URL)
        .map((r) => r.url);
      return [...new Set([...userRelays, ...NIP46_RELAYS])];
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
