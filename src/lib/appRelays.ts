import type { RelayMetadata } from '@/contexts/AppContext';

/**
 * Known relays this app surfaces in the settings dialog.
 *
 * Only `relay.relaying.earth` is enabled out of the box — it's the project's
 * own relay and the canonical home for weather station events. Everything else
 * is shown in the settings list so the user can flip it on with one click, or
 * leave it off.
 */
export const DEFAULT_RELAYS: { url: string; note?: string }[] = [
  {
    url: 'wss://relay.relaying.earth',
    note: "The project's own relay — weather station events live here.",
  },
  { url: 'wss://relay.ditto.pub', note: 'General-purpose Nostr relay.' },
  { url: 'wss://relay.primal.net', note: 'General-purpose Nostr relay.' },
  { url: 'wss://nos.lol', note: 'Community-run general-purpose relay.' },
  { url: 'wss://relay.nostr.band', note: 'Indexed Nostr relay.' },
];

export function isDefaultRelay(url: string): boolean {
  return DEFAULT_RELAYS.some((r) => r.url === url);
}

/**
 * Initial relay config for new installs: only the project's relay is on.
 */
export const WEATHER_RELAY_URL = 'wss://relay.relaying.earth';

/**
 * General-purpose relays for NIP-46 signer handshakes. The weather relay
 * blocks kind 24133, so bunker / nostrconnect must not use it.
 */
export const NIP46_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.primal.net',
] as const;

export const APP_RELAYS: RelayMetadata = {
  relays: [
    { url: WEATHER_RELAY_URL, read: true, write: true },
  ],
  updatedAt: 0,
};
