import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowRight } from 'lucide-react';

import { WeatherGlobe } from '@/components/WeatherGlobe';
import { StationDetailPanel } from '@/components/StationDetailPanel';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useOnlineStationCount } from '@/hooks/useOnlineStationCount';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';

const Index = () => {
  useSeoMeta({
    title: 'relaying.earth — Nostr weather stations',
    description:
      "A decentralised mesh of Nostr-powered weather stations relaying the planet's weather in real time.",
  });

  const [selectedStation, setSelectedStation] = useState<WeatherStationMetadata | null>(null);
  const { data: stations } = useWeatherStations();
  const { data: onlineCount, isLoading: onlineCountLoading } = useOnlineStationCount();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="shrink-0">
        <Navbar />
      </div>

      {/* Globe fills remaining viewport */}
      <div className="relative min-h-0 flex-1">
        <WeatherGlobe
          stations={stations || []}
          onStationClick={setSelectedStation}
          highlightedPubkey={selectedStation?.pubkey ?? null}
        />

        {/* Mobile: single full-width panel, no overlapping cards */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 sm:hidden">
          <div className="rounded-2xl bg-background/85 px-4 py-4 shadow-sm backdrop-blur-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Live · Decentralised · Open
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
              The planet,{' '}
              <span className="text-brand-maroon">relayed.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nostr-powered weather stations broadcasting in real time.
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="pointer-events-auto min-w-0">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/stations">
                    Explore the network
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Stations online
                </p>
                {onlineCountLoading ? (
                  <div className="mt-1 h-9 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
                    {onlineCount ?? 0}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: split corner panels */}
        <div className="pointer-events-none absolute bottom-12 left-12 z-10 hidden max-w-md rounded-2xl bg-background/70 px-5 py-4 shadow-sm backdrop-blur-md sm:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Live · Decentralised · Open
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            The planet,{' '}
            <span className="text-brand-maroon">relayed.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nostr-powered weather stations broadcasting in real time.
          </p>
          <div className="pointer-events-auto mt-5">
            <Button asChild size="lg">
              <Link to="/stations">
                Explore the network
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
            Drag to spin · scroll to zoom · click a station
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-12 right-12 z-10 hidden rounded-2xl bg-background/70 px-5 py-4 text-right shadow-sm backdrop-blur-md sm:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Stations online
          </p>
          {onlineCountLoading ? (
            <div className="mt-1 ml-auto h-10 w-10 animate-pulse rounded bg-muted" />
          ) : (
            <p className="font-display text-4xl font-semibold tabular-nums text-foreground sm:text-5xl">
              {onlineCount ?? 0}
            </p>
          )}
        </div>
      </div>

      {selectedStation && (
        <StationDetailPanel
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
};

export default Index;
