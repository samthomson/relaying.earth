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
  const { data: onlineCount } = useOnlineStationCount();

  return (
    <div className="flex min-h-dvh flex-col bg-background md:h-screen md:overflow-hidden">
      <div className="shrink-0">
        <Navbar />
      </div>

      {/* Globe fills remaining viewport */}
      <div className="relative min-h-[min(100dvh,720px)] flex-1 md:min-h-0">
        <WeatherGlobe
          stations={stations || []}
          onStationClick={setSelectedStation}
          highlightedPubkey={selectedStation?.pubkey ?? null}
        />

        {/* Bottom-left: title + CTA */}
        <div className="pointer-events-none absolute bottom-8 left-8 z-10 max-w-md rounded-2xl bg-background/70 px-5 py-4 shadow-sm backdrop-blur-md sm:bottom-12 sm:left-12">
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
          <p className="mt-4 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 sm:block">
            Drag to spin · scroll to zoom · click a station
          </p>
        </div>

        {/* Bottom-right: station count */}
        <div className="pointer-events-none absolute bottom-8 right-8 z-10 rounded-2xl bg-background/70 px-5 py-4 text-right shadow-sm backdrop-blur-md sm:bottom-12 sm:right-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Stations online
          </p>
          <p className="font-display text-4xl font-semibold tabular-nums text-foreground sm:text-5xl">
            {onlineCount ?? '—'}
          </p>
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
