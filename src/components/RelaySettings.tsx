import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { useAppContext } from '@/hooks/useAppContext';
import { DEFAULT_RELAYS, isDefaultRelay } from '@/lib/appRelays';
import {
  displayRelayUrl,
  isValidRelayUrl,
  normalizeRelayUrl,
} from '@/lib/relayUrl';
import { useToast } from '@/hooks/useToast';

/**
 * Minimal relay manager: one list. Each row is on/off. Customs add a remove
 * button. State lives in `config.relayMetadata.relays` and is purely local —
 * no NIP-65 publishing, no auto-sync from the network.
 */
export function RelaySettings() {
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();

  const [newRelayUrl, setNewRelayUrl] = useState('');

  const activeUrls = new Set(config.relayMetadata.relays.map((r) => r.url));

  // Build the unified row list: defaults (in declared order) followed by any
  // custom relays the user has added.
  const rows: { url: string; note?: string; isDefault: boolean }[] = [
    ...DEFAULT_RELAYS.map((d) => ({ ...d, isDefault: true })),
    ...config.relayMetadata.relays
      .filter((r) => !isDefaultRelay(r.url))
      .map((r) => ({ url: r.url, isDefault: false })),
  ];

  const commit = (urls: string[]) => {
    // eslint-disable-next-line react-hooks/purity
    const now = Math.floor(Date.now() / 1000);
    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: urls.map((url) => ({ url, read: true, write: true })),
        updatedAt: now,
      },
    }));
  };

  const setEnabled = (url: string, enabled: boolean) => {
    if (enabled && !activeUrls.has(url)) {
      commit([...activeUrls, url]);
    } else if (!enabled && activeUrls.has(url)) {
      commit([...activeUrls].filter((u) => u !== url));
    }
  };

  const removeCustom = (url: string) => {
    if (!activeUrls.has(url)) return;
    commit([...activeUrls].filter((u) => u !== url));
  };

  const handleAdd = () => {
    if (!isValidRelayUrl(newRelayUrl)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Expected something like wss://relay.example.com',
        variant: 'destructive',
      });
      return;
    }
    const normalized = normalizeRelayUrl(newRelayUrl);
    if (activeUrls.has(normalized)) {
      toast({ title: 'Already added' });
      setNewRelayUrl('');
      return;
    }
    commit([...activeUrls, normalized]);
    setNewRelayUrl('');
  };

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/70 bg-muted/20">
        {rows.map((row) => {
          const enabled = activeUrls.has(row.url);
          return (
            <li key={row.url} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="truncate font-mono text-sm"
                    title={row.url}
                  >
                    {displayRelayUrl(row.url)}
                  </span>
                  {row.isDefault && (
                    <Badge
                      variant="outline"
                      className="border-border/80 bg-background text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
                    >
                      default
                    </Badge>
                  )}
                </div>
                {row.note && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {row.note}
                  </div>
                )}
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => setEnabled(row.url, v)}
                aria-label={`Toggle ${row.url}`}
              />
              {!row.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustom(row.url)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${row.url}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Label htmlFor="new-relay-url" className="sr-only">
          Add a relay
        </Label>
        <Input
          id="new-relay-url"
          placeholder="wss://relay.example.com"
          value={newRelayUrl}
          onChange={(e) => setNewRelayUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="font-mono"
        />
        <Button onClick={handleAdd} disabled={!newRelayUrl.trim()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add relay
        </Button>
      </div>
    </div>
  );
}
