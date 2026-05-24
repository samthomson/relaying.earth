import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { Search, MapPin, ArrowLeft } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { getSensorName } from '@/lib/weatherUtils';

const StationListPage = () => {
  useSeoMeta({
    title: 'Weather Stations - Nostr Weather',
    description: 'Browse all weather stations in the decentralized Nostr weather network.',
  });

  const { data: stations, isLoading } = useWeatherStations();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);

  // Get unique sensor types across all stations
  const availableSensors = useMemo(() => {
    if (!stations) return [];
    const sensorTypes = new Set<string>();
    stations.forEach((station) => {
      station.sensors.forEach((sensor) => {
        sensorTypes.add(sensor.type);
      });
    });
    return Array.from(sensorTypes).sort();
  }, [stations]);

  // Filter stations
  const filteredStations = useMemo(() => {
    if (!stations) return [];

    return stations.filter((station) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = station.name?.toLowerCase().includes(query);
        const matchesDescription = station.description?.toLowerCase().includes(query);
        const matchesGeohash = station.geohash?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesGeohash) {
          return false;
        }
      }

      // Sensor filter
      if (selectedSensor) {
        const hasSensor = station.sensors.some((s) => s.type === selectedSensor);
        if (!hasSensor) return false;
      }

      return true;
    });
  }, [stations, searchQuery, selectedSensor]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Weather Stations</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading...' : `${filteredStations.length} stations`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, location, or geohash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sensor type filter */}
          {availableSensors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center mr-2">
                Filter by sensor:
              </span>
              <Button
                variant={selectedSensor === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSensor(null)}
              >
                All
              </Button>
              {availableSensors.map((sensorType) => (
                <Button
                  key={sensorType}
                  variant={selectedSensor === sensorType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSensor(sensorType)}
                >
                  {getSensorName(sensorType)}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Station List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchQuery || selectedSensor
                  ? 'No stations match your filters. Try adjusting your search.'
                  : 'No weather stations found. Be the first to set one up!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStations.map((station) => {
              const npub = nip19.npubEncode(station.pubkey);
              return (
                <Link key={station.pubkey} to={`/${npub}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {station.name || 'Unnamed Station'}
                      </CardTitle>
                      {station.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {station.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Location */}
                      {station.geohash && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground">
                            {station.geohash}
                          </span>
                        </div>
                      )}

                      {/* Sensors */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Sensors ({station.sensors.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {station.sensors.slice(0, 4).map((sensor, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {getSensorName(sensor.type)}
                            </Badge>
                          ))}
                          {station.sensors.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{station.sensors.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Hardware */}
                      <div className="flex gap-2 text-xs">
                        {station.power && (
                          <Badge variant="outline">{station.power}</Badge>
                        )}
                        {station.connectivity && (
                          <Badge variant="outline">{station.connectivity}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default StationListPage;
