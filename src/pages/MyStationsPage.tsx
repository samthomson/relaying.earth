import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  Check,
  Layers,
  MapPin,
  ArrowRight,
} from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoginArea } from '@/components/auth/LoginArea';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useStationLists,
  useCreateOrUpdateStationList,
  useDeleteStationList,
} from '@/hooks/useStationLists';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import type { StationList, WeatherStationMetadata } from '@/lib/weatherUtils';
import { useToast } from '@/hooks/useToast';

interface ListFormState {
  identifier: string;
  title: string;
  description: string;
  stations: string[];
}

const EMPTY_FORM: ListFormState = {
  identifier: '',
  title: '',
  description: '',
  stations: [],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

const MyStationsPage = () => {
  useSeoMeta({
    title: 'My lists — relaying.earth',
    description: 'Curate sets of Nostr weather stations you care about.',
  });

  const { user } = useCurrentUser();
  const { data: lists, isLoading: listsLoading } = useStationLists(user?.pubkey);
  const { data: allStations, isLoading: stationsLoading } = useWeatherStations();
  const createOrUpdateList = useCreateOrUpdateStationList();
  const deleteList = useDeleteStationList();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<string | null>(null);
  const [stationSearch, setStationSearch] = useState('');
  const [form, setForm] = useState<ListFormState>(EMPTY_FORM);
  const [touchedIdentifier, setTouchedIdentifier] = useState(false);

  const filteredStationsForPicker = useMemo<WeatherStationMetadata[]>(() => {
    if (!allStations) return [];
    const q = stationSearch.toLowerCase().trim();
    if (!q) return allStations;
    return allStations.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.geohash?.toLowerCase().includes(q) ||
        s.pubkey.toLowerCase().startsWith(q),
    );
  }, [allStations, stationSearch]);

  const openCreate = () => {
    setEditingIdentifier(null);
    setForm(EMPTY_FORM);
    setTouchedIdentifier(false);
    setStationSearch('');
    setDialogOpen(true);
  };

  const openEdit = (list: StationList) => {
    setEditingIdentifier(list.identifier);
    setForm({
      identifier: list.identifier,
      title: list.title || '',
      description: list.description || '',
      stations: list.stations,
    });
    setTouchedIdentifier(true);
    setStationSearch('');
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      identifier:
        editingIdentifier === null && !touchedIdentifier
          ? slugify(title)
          : prev.identifier,
    }));
  };

  const handleSubmit = async () => {
    const identifier = form.identifier.trim();
    const title = form.title.trim();
    if (!identifier || !title) {
      toast({
        title: 'Missing fields',
        description: 'A list needs a title and identifier.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await createOrUpdateList.mutateAsync({
        identifier,
        title,
        description: form.description.trim() || undefined,
        stations: form.stations,
      });
      toast({
        title: editingIdentifier ? 'List updated' : 'List created',
        description: `Published kind 36643 event to your relays.`,
      });
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to save',
        description: 'Check that you are signed in and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (identifier: string) => {
    if (!confirm(`Delete the list "${identifier}"? This cannot be undone.`)) return;
    try {
      await deleteList.mutateAsync(identifier);
      toast({ title: 'List deleted' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to delete',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const toggleStation = (pubkey: string) => {
    setForm((prev) => ({
      ...prev,
      stations: prev.stations.includes(pubkey)
        ? prev.stations.filter((p) => p !== pubkey)
        : [...prev.stations, pubkey],
    }));
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              Signed-out
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Sign in to manage your lists
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your station lists are published as kind 36643 events on Nostr — they're
              owned by your Nostr identity, not by this app.
            </p>
            <div className="mt-6 inline-flex">
              <LoginArea className="max-w-60" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-x-0 -top-32 h-72 bg-[radial-gradient(circle_at_70%_50%,color-mix(in_oklab,var(--brand-purple)_22%,transparent),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-12 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              You · kind 36643
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              My lists
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Curate sets of weather stations and publish them as a signed Nostr event.
              Any client supporting NIP-51 lists can read them — they belong to you, not
              to this app.
            </p>
          </div>
          <Button onClick={openCreate} size="lg" className="h-11 gap-2">
            <Plus className="h-4 w-4" />
            New list
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        {listsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card/60">
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lists && lists.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <ListCard
                key={list.identifier}
                list={list}
                allStations={allStations || []}
                onEdit={() => openEdit(list)}
                onDelete={() => handleDelete(list.identifier)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-card/40">
            <CardContent className="py-16 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/70" />
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                You haven't published any station lists yet.
              </p>
              <Button onClick={openCreate} className="mt-5 gap-2">
                <Plus className="h-4 w-4" />
                Create your first list
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <span hidden />
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIdentifier ? 'Edit list' : 'New station list'}
            </DialogTitle>
            <DialogDescription>
              Publishes a signed kind 36643 event to your relays. Any client supporting
              NIP-51 sets can read it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Title
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Bangkok rooftops"
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Identifier (d-tag)
                </label>
                <Input
                  value={form.identifier}
                  onChange={(e) => {
                    setTouchedIdentifier(true);
                    setForm((prev) => ({
                      ...prev,
                      identifier: slugify(e.target.value),
                    }));
                  }}
                  placeholder="bangkok-rooftops"
                  className="mt-1.5 font-mono"
                  disabled={!!editingIdentifier}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Lowercase slug. Cannot be changed after creation.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional. A short summary that other clients can show."
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Stations ({form.stations.length})
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {stationsLoading ? 'loading…' : `${allStations?.length ?? 0} available`}
                </span>
              </div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={stationSearch}
                  onChange={(e) => setStationSearch(e.target.value)}
                  placeholder="Search stations…"
                  className="pl-9"
                />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border border-border/60 bg-muted/20">
                {filteredStationsForPicker.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No stations match.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {filteredStationsForPicker.map((station) => {
                      const selected = form.stations.includes(station.pubkey);
                      return (
                        <li key={station.pubkey}>
                          <button
                            type="button"
                            onClick={() => toggleStation(station.pubkey)}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              selected
                                ? 'bg-primary/10'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <span
                              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background'
                              }`}
                              aria-hidden
                            >
                              {selected && <Check className="h-3 w-3" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {station.name || 'Unnamed station'}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {station.geohash && (
                                  <span className="inline-flex items-center gap-1 font-mono">
                                    <MapPin className="h-3 w-3" />
                                    {station.geohash}
                                  </span>
                                )}
                                <span className="truncate">
                                  {station.sensors.length} sensors
                                </span>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={createOrUpdateList.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createOrUpdateList.isPending}
              className="gap-2"
            >
              {createOrUpdateList.isPending ? 'Publishing…' : 'Publish list'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ListCard({
  list,
  allStations,
  onEdit,
  onDelete,
}: {
  list: StationList;
  allStations: WeatherStationMetadata[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Tombstone lists (deleted by publishing empty replacements) — hide
  if (list.stations.length === 0 && !list.title && !list.description) {
    return null;
  }

  const sensorTypes = new Set<string>();
  list.stations.forEach((p) => {
    const station = allStations.find((s) => s.pubkey === p);
    station?.sensors.forEach((sensor) => sensorTypes.add(sensor.type));
  });

  return (
    <Card className="group relative h-full overflow-hidden border-border/70 bg-card/60 transition-colors hover:border-primary/30">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-display text-lg font-semibold leading-tight">
              {list.title || list.identifier}
            </h3>
            <p className="font-mono text-[11px] text-muted-foreground">
              d · {list.identifier}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {list.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{list.description}</p>
        )}

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between border-y border-border/60 py-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>{list.stations.length} stations</span>
            <span>{sensorTypes.size} sensor kinds</span>
          </div>

          <div className="space-y-1.5">
            {list.stations.slice(0, 3).map((pubkey) => {
              const station = allStations.find((s) => s.pubkey === pubkey);
              const npub = nip19.npubEncode(pubkey);
              return (
                <Link key={pubkey} to={`/${npub}`} className="block">
                  <div className="flex items-center gap-3 rounded-md border border-transparent bg-muted/30 px-2.5 py-1.5 transition-colors hover:border-border hover:bg-muted/50">
                    <div className="relative inline-flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">
                        {station?.name || (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {pubkey.slice(0, 14)}…
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
            {list.stations.length > 3 && (
              <Badge
                variant="outline"
                className="border-border/80 bg-muted/40 text-[11px] text-muted-foreground"
              >
                +{list.stations.length - 3} more
              </Badge>
            )}
            {list.stations.length === 0 && (
              <p className="text-[11px] text-muted-foreground">List is empty.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MyStationsPage;
