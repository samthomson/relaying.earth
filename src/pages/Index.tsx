import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { WeatherGlobe } from '@/components/WeatherGlobe';
import { StationDetailPanel } from '@/components/StationDetailPanel';
import { Navbar } from '@/components/Navbar';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import { Loader2 } from 'lucide-react';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Weather - Decentralized Weather Station Network',
    description: 'Explore weather data from a global network of decentralized weather stations powered by Nostr.',
  });

  const [selectedStation, setSelectedStation] = useState<WeatherStationMetadata | null>(null);
  const { data: stations, isLoading } = useWeatherStations();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading weather stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Navbar />
      <div className="absolute inset-0 top-[57px]">
        <WeatherGlobe
          stations={stations || []}
          onStationClick={setSelectedStation}
        />
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
