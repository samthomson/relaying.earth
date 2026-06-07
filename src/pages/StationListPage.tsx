import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Search, MapPin, X } from 'lucide-react';
import { nip19 } from 'nostr-tools';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useWeatherStations } from '@/hooks/useWeatherStations';
import { useLatestReadingsForStations } from '@/hooks/useLatestReadingsForStations';
import { ReadingAgeBadge } from '@/components/ReadingAgeBadge';
import { StationCardReadings } from '@/components/StationCardReadings';
import { getSensorName } from '@/lib/weatherUtils';
import type { WeatherStationMetadata, WeatherReading } from '@/lib/weatherUtils';

type SortKey = 'sensors' | 'name' | 'recent';

const StationListPage = () => {
  useSeoMeta({
    title: 'Stations — relaying.earth',
    description:
      'Browse every weather station broadcasting on the relaying.earth Nostr network.',
  });

  const { data: stations, isLoading } = useWeatherStations();
  const stationPubkeys = useMemo(
    () => stations?.map((station) => station.pubkey) ?? [],
    [stations],
  );
  const { data: latestReadings, isLoading: latestReadingsLoading } =
    useLatestReadingsForStations(stationPubkeys);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('sensors');

  const availableSensors = useMemo(() => {
    if (!stations) return [];
    const sensorTypes = new Set<string>();
    stations.forEach((station) => {
      station.sensors.forEach((sensor) => sensorTypes.add(sensor.type));
    });
    return Array.from(sensorTypes).sort();
  }, [stations]);

  const filteredStations = useMemo<WeatherStationMetadata[]>(() => {
    if (!stations) return [];
    const filtered = stations.filter((station) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = station.name?.toLowerCase().includes(query);
        const matchesDescription = station.description?.toLowerCase().includes(query);
        const matchesGeohash = station.geohash?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesGeohash) {
          return false;
        }
      }
      if (selectedSensor) {
        const hasSensor = station.sensors.some((s) => s.type === selectedSensor);
        if (!hasSensor) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) =>
          (a.name || 'zzzz').localeCompare(b.name || 'zzzz', undefined, {
            sensitivity: 'base',
          }),
        );
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const aTs = latestReadings?.[a.pubkey]?.timestamp ?? a.event.created_at;
          const bTs = latestReadings?.[b.pubkey]?.timestamp ?? b.event.created_at;
          return bTs - aTs;
        });
        break;
      case 'sensors':
      default:
        sorted.sort((a, b) => b.sensors.length - a.sensors.length);
        break;
    }
    return sorted;
  }, [stations, searchQuery, selectedSensor, sortKey, latestReadings]);

  const activeFilterCount =
    (searchQuery ? 1 : 0) + (selectedSensor ? 1 : 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/0 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-brand-maroon">
            Network
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            All stations
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {isLoading
              ? 'Discovering stations on the relays…'
              : `${filteredStations.length} ${filteredStations.length === 1 ? 'station' : 'stations'} broadcasting`}
            {activeFilterCount > 0 && ' (filtered)'}.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, description, or geohash…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Sort
            </span>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sensors">Most sensors</SelectItem>
                <SelectItem value="recent">Recently updated</SelectItem>
                <SelectItem value="name">Name (A→Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {availableSensors.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Sensor
            </span>
            <button
              type="button"
              onClick={() => setSelectedSensor(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedSensor === null
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              All
            </button>
            {availableSensors.map((sensorType) => {
              const active = selectedSensor === sensorType;
              return (
                <button
                  key={sensorType}
                  type="button"
                  onClick={() => setSelectedSensor(active ? null : sensorType)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {getSensorName(sensorType)}
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-card/60">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <div className="mt-4 flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStations.length === 0 ? (
          <Card className="border-dashed bg-card/40">
            <CardContent className="py-16 text-center">
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {activeFilterCount > 0
                  ? 'No stations match your filters.'
                  : 'No weather stations have published metadata on the relays this client is connected to.'}
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSensor(null);
                  }}
                >
                  Reset filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStations.map((station) => (
              <StationListCard
                key={station.pubkey}
                station={station}
                latestReading={latestReadings?.[station.pubkey] ?? null}
                readingsLoading={latestReadingsLoading}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

function StationListCard({
  station,
  latestReading,
  readingsLoading,
}: {
  station: WeatherStationMetadata;
  latestReading: WeatherReading | null;
  readingsLoading: boolean;
}) {
  const npub = nip19.npubEncode(station.pubkey);
  const okSensors = station.sensors.filter(
    (s) =>
      !station.sensorStatuses.find(
        (st) => st.type === s.type && st.model === s.model && st.status !== 'ok',
      ),
  ).length;

  return (
    <Link to={`/${npub}`} className="group block h-full">
      <Card className="relative h-full overflow-hidden border-border/70 bg-card/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-display text-lg font-semibold leading-tight group-hover:text-primary">
              {station.name || 'Unnamed station'}
            </h3>
            <ReadingAgeBadge
              timestamp={latestReading?.timestamp}
              loading={readingsLoading}
            />
          </div>

          {station.description && (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {station.description}
            </p>
          )}

          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{station.geohash || '—'}</span>
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="shrink-0">
              {okSensors}/{station.sensors.length} sensors
            </span>
          </div>

          {readingsLoading ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : latestReading ? (
            <StationCardReadings readings={latestReading.readings} />
          ) : (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
              No readings yet
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default StationListPage;
