import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowRight, Code2, Radio } from 'lucide-react';

import { WeatherGlobe } from '@/components/WeatherGlobe';
import { StationDetailPanel } from '@/components/StationDetailPanel';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import { useRecentReadings } from '@/hooks/useRecentReadings';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';
import {
  formatSensorValue,
  getSensorName,
} from '@/lib/weatherUtils';
import { formatRelativeTime } from '@/lib/timeUtils';
import { nip19 } from 'nostr-tools';

const Index = () => {
  useSeoMeta({
    title: 'relaying.earth — Nostr weather stations',
    description:
      "A decentralised mesh of Nostr-powered weather stations relaying the planet's weather in real time.",
  });

  const [selectedStation, setSelectedStation] = useState<WeatherStationMetadata | null>(null);

  const { data: stations, isLoading: stationsLoading } = useWeatherStations();
  // Rebucket the "last 24h" window every minute so the live ticker keeps fresh
  // data. Computed via state to keep render pure (no Date.now() calls during
  // render).
  const [sinceOneDay, setSinceOneDay] = useState(
    () => Math.floor(Date.now() / 1000) - 24 * 3600,
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setSinceOneDay(Math.floor(Date.now() / 1000) - 24 * 3600);
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const { data: recentReadings } = useRecentReadings({
    limit: 80,
    since: sinceOneDay,
  });

  const stats = useMemo(() => {
    const list = stations || [];
    const sensorTypes = new Set<string>();
    const geohashPrefixes = new Set<string>();
    list.forEach((s) => {
      s.sensors.forEach((sensor) => sensorTypes.add(sensor.type));
      if (s.geohash) geohashPrefixes.add(s.geohash.slice(0, 2));
    });
    return {
      stations: list.length,
      sensorTypes: sensorTypes.size,
      regions: geohashPrefixes.size,
      readingsLastDay: recentReadings?.length ?? 0,
    };
  }, [stations, recentReadings]);

  const featured = useMemo(() => {
    if (!stations) return [];
    return [...stations]
      .filter((s) => s.lat !== undefined && s.lng !== undefined)
      .sort((a, b) => b.sensors.length - a.sensors.length)
      .slice(0, 6);
  }, [stations]);

  const tickerItems = useMemo(() => {
    if (!recentReadings) return [];
    return recentReadings.slice(0, 10).map((r) => {
      const station = stations?.find((s) => s.pubkey === r.pubkey);
      return { reading: r, station };
    });
  }, [recentReadings, stations]);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <Navbar floating />

      {/* HERO — full viewport with globe */}
      <section className="relative -mt-16 h-screen w-full overflow-hidden pt-16">
        <div className="absolute inset-0">
          <WeatherGlobe
            stations={stations || []}
            onStationClick={setSelectedStation}
            highlightedPubkey={selectedStation?.pubkey ?? null}
          />
        </div>

        {/* Soft brand vignette over the globe so text reads clearly */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-background via-background/65 to-transparent" />

        {/* Hero copy. The wrapper itself is `pointer-events-none` so the
            globe behind it stays interactive — every clickable / hoverable
            piece below opts back in with `pointer-events-auto`. */}
        <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-between px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="pointer-events-auto mb-5 border-primary/40 bg-primary/10 font-mono text-[10px] uppercase tracking-[0.28em] text-primary"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Decentralised · Permissionless · Open
            </Badge>
            <h1 className="pointer-events-auto text-balance font-display text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              The planet,{' '}
              <span className="brand-gradient-text">
                relayed.
              </span>
            </h1>
            <p className="pointer-events-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              A live, decentralised network of weather stations broadcasting over Nostr.
              Every station is its own keypair, signing its own readings, no API key, no
              gatekeeper — just weather, relayed straight off the planet.
            </p>

            <div className="pointer-events-auto mt-7 flex flex-wrap items-center gap-3">
              <Link to="/stations">
                <Button size="lg" className="group h-11 gap-2 font-medium">
                  Explore the network
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <a
                href="https://github.com/samthomson/weather-station"
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 gap-2 border-border bg-background/40 backdrop-blur"
                >
                  <Code2 className="h-4 w-4" />
                  Build a station
                </Button>
              </a>
            </div>

            <div className="pointer-events-none mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80">
              <span className="inline-block h-px w-6 bg-muted-foreground/40" />
              Drag to spin · scroll to zoom · click a station
            </div>
          </div>

          {/* Stats strip at the bottom */}
          <div className="pointer-events-auto grid w-full grid-cols-2 gap-3 sm:max-w-3xl sm:grid-cols-4">
            <Stat
              value={stats.stations}
              label="Stations"
              loading={stationsLoading}
              accent="orange"
            />
            <Stat
              value={stats.readingsLastDay}
              label="Readings · 24h"
              loading={stationsLoading}
              accent="purple"
            />
            <Stat
              value={stats.sensorTypes}
              label="Sensor kinds"
              loading={stationsLoading}
              accent="maroon"
            />
            <Stat
              value={stats.regions}
              label="Geohash regions"
              loading={stationsLoading}
              accent="orange"
            />
          </div>
        </div>
      </section>

      {/* LIVE TICKER */}
      {tickerItems.length > 0 && (
        <section className="relative border-y border-border bg-muted/20 py-4">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6">
            <div className="flex shrink-0 items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-primary">
              <Radio className="h-3 w-3" />
              Live
            </div>
            <div className="relative flex-1 overflow-hidden">
              <div className="flex w-max animate-marquee gap-10 will-change-transform motion-reduce:animate-none">
                {[...tickerItems, ...tickerItems].map(({ reading, station }, idx) => {
                  const headline = reading.readings[0];
                  return (
                    <div
                      key={`${reading.event.id}-${idx}`}
                      className="flex items-baseline gap-2 whitespace-nowrap text-sm"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatRelativeTime(reading.timestamp)}
                      </span>
                      <span className="font-medium">
                        {station?.name || 'Anonymous station'}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      {headline && (
                        <span>
                          <span className="text-muted-foreground">{getSensorName(headline.type)} </span>
                          <span className="font-display font-semibold text-primary">
                            {formatSensorValue(headline.type, headline.value)}
                          </span>
                        </span>
                      )}
                      {reading.readings.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          +{reading.readings.length - 1} more
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Edge fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
            </div>
          </div>
        </section>
      )}

      {/* FEATURED STATIONS */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              Featured
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Currently relaying
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              A handful of stations from across the network — sorted by sensor breadth.
            </p>
          </div>
          <Link to="/stations">
            <Button variant="outline" className="gap-2">
              All stations
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {featured.length === 0 ? (
          <Card className="mt-8 border-dashed bg-card/40">
            <CardContent className="py-12 text-center">
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                No stations have published yet. Be the first — point your weather station
                at one of this app's relays and start signing kind <code className="font-mono">16158</code> events.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((station) => {
              const npub = nip19.npubEncode(station.pubkey);
              return (
                <Link key={station.pubkey} to={`/${npub}`} className="group">
                  <Card className="relative h-full overflow-hidden border-border/70 bg-card/60 transition-colors hover:border-primary/40">
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-primary">
                      <span className="relative inline-flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      relaying
                    </span>
                    <CardContent className="p-5">
                      <h3 className="pr-24 font-display text-lg font-semibold leading-tight">
                        {station.name || 'Unnamed station'}
                      </h3>
                      {station.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {station.description}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {station.sensors.slice(0, 5).map((sensor, idx) => (
                          <Badge
                            key={`${sensor.type}-${idx}`}
                            variant="outline"
                            className="border-border/80 bg-muted/40 text-[11px] text-foreground"
                          >
                            {getSensorName(sensor.type)}
                          </Badge>
                        ))}
                        {station.sensors.length > 5 && (
                          <Badge variant="outline" className="border-border/80 bg-muted/40 text-[11px] text-muted-foreground">
                            +{station.sensors.length - 5}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>
                          {station.geohash ? `◉ ${station.geohash}` : '◌ no geohash'}
                        </span>
                        <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          open →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ABOUT / WHAT IS THIS */}
      <section className="relative border-t border-border bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
                What is this?
              </p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Weather data, with no middleman.
              </h2>
              <p className="mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
                Every weather station owns its identity. It signs each reading with its
                own private key and pushes it onto the Nostr network. Anyone, anywhere,
                can subscribe directly — relayed peer-to-peer rather than locked inside a
                weather company's API.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                <Bullet>
                  <strong className="text-foreground">Kind 16158</strong> · station
                  metadata (replaceable). Identity, location, sensors.
                </Bullet>
                <Bullet>
                  <strong className="text-foreground">Kind 4223</strong> · sensor
                  readings (regular). One event per cycle, tags hold the values.
                </Bullet>
                <Bullet>
                  <strong className="text-foreground">Kind 36643</strong> · custom NIP-51
                  list. Group stations into curated sets.
                </Bullet>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://github.com/nostr-protocol/nips/pull/2163"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    Read the draft NIP
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <a
                  href="https://github.com/samthomson/weather-station"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="ghost" className="gap-2">
                    <Code2 className="h-4 w-4" />
                    Reference firmware
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-grid opacity-30" />
              <div className="relative grid grid-cols-2 gap-3">
                <FlowCard step="01" title="Station signs" body="A station signs a kind 4223 event with its own nsec. No central account." />
                <FlowCard step="02" title="Relay forwards" body="Open Nostr relays propagate the event to subscribers globally." />
                <FlowCard step="03" title="Client reads" body="This app — and any other — queries the relays. No API key." />
                <FlowCard step="04" title="You verify" body="Signatures are checked locally. Nobody can fake a station's data." />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {selectedStation && (
        <StationDetailPanel
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
};

function Stat({
  value,
  label,
  loading,
  accent,
}: {
  value: number;
  label: string;
  loading?: boolean;
  accent: 'orange' | 'purple' | 'maroon';
}) {
  const accentClass = {
    orange: 'text-primary',
    purple: 'text-[color:var(--brand-purple)]',
    maroon: 'text-[color:var(--brand-maroon)]',
  }[accent];
  return (
    <div className="rounded-md border border-border/70 bg-background/55 px-4 py-3 backdrop-blur">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${accentClass}`}>
        {loading ? '—' : value.toLocaleString()}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-muted-foreground">
      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

function FlowCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
        {step}
      </div>
      <div className="mt-2 font-display text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

export default Index;
