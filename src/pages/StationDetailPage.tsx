import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link, useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useWeatherStation } from '@/hooks/useWeatherStations';
import { useStationReadings } from '@/hooks/useStationReadings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getSensorName, formatSensorValue, getSensorUnit } from '@/lib/weatherUtils';

const StationDetailPage = () => {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  // Decode NIP-19 identifier
  let pubkey: string | undefined;
  try {
    if (nip19Param) {
      const decoded = nip19.decode(nip19Param);
      if (decoded.type === 'npub') {
        pubkey = decoded.data;
      } else if (decoded.type === 'nprofile') {
        pubkey = decoded.data.pubkey;
      }
    }
  } catch {
    // Invalid NIP-19
  }

  // Calculate since timestamp based on time range
  const since = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    switch (timeRange) {
      case '1h':
        return now - 3600;
      case '24h':
        return now - 86400;
      case '7d':
        return now - 604800;
    }
  }, [timeRange]);

  const { data: station, isLoading: stationLoading } = useWeatherStation(pubkey);
  const { data: readings, isLoading: readingsLoading } = useStationReadings({
    pubkey,
    since,
    limit: timeRange === '1h' ? 60 : timeRange === '24h' ? 144 : 1008,
  });

  useSeoMeta({
    title: station?.name
      ? `${station.name} - Nostr Weather`
      : 'Weather Station - Nostr Weather',
    description:
      station?.description ||
      'View real-time and historical weather data from this decentralized weather station.',
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return {};

    // Group by sensor type
    const sensorData: Record<string, Array<{ timestamp: number; value: number; label: string }>> =
      {};

    readings.forEach((reading) => {
      reading.readings.forEach((r) => {
        if (!sensorData[r.type]) {
          sensorData[r.type] = [];
        }
        const value = parseFloat(r.value);
        if (!isNaN(value)) {
          sensorData[r.type].push({
            timestamp: reading.timestamp,
            value,
            label: new Date(reading.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        }
      });
    });

    // Sort by timestamp ascending
    Object.keys(sensorData).forEach((key) => {
      sensorData[key].sort((a, b) => a.timestamp - b.timestamp);
    });

    return sensorData;
  }, [readings]);

  const latestReading = readings?.[0];

  if (!pubkey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">
              Invalid station identifier. Please check the URL.
            </p>
            <Link to="/">
              <Button variant="default" className="mt-4">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading station...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">
              Station not found. It may not have published metadata yet.
            </p>
            <Link to="/">
              <Button variant="default" className="mt-4">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/stations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{station.name || 'Unnamed Station'}</h1>
              {station.description && (
                <p className="text-sm text-muted-foreground">{station.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Station Info */}
          <div className="space-y-6">
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {station.geohash && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Geohash:</span>
                    <span className="font-mono">{station.geohash}</span>
                  </div>
                )}
                {station.lat !== undefined && station.lng !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coordinates:</span>
                    <span className="font-mono text-xs">
                      {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                    </span>
                  </div>
                )}
                {station.elevation !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Elevation:</span>
                    <span>{station.elevation}m</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hardware */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Hardware</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {station.power && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <Badge variant="secondary">{station.power}</Badge>
                  </div>
                )}
                {station.connectivity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connectivity:</span>
                    <Badge variant="secondary">{station.connectivity}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sensors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sensors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {station.sensors.map((sensor, idx) => {
                  const status = station.sensorStatuses.find(
                    (s) => s.type === sensor.type && s.model === sensor.model
                  );
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{getSensorName(sensor.type)}</div>
                        <div className="text-xs text-muted-foreground">{sensor.model}</div>
                      </div>
                      {status && (
                        <Badge
                          variant={status.status === 'ok' ? 'default' : 'secondary'}
                          className={status.status === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}
                        >
                          {status.status === 'ok' ? 'OK' : 'Error'}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Latest Reading */}
            {latestReading && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Latest Reading</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      {new Date(latestReading.timestamp * 1000).toLocaleString()}
                    </div>
                    {latestReading.readings.map((reading, idx) => (
                      <div key={idx} className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">
                          {getSensorName(reading.type)}
                        </span>
                        <span className="text-lg font-semibold">
                          {formatSensorValue(reading.type, reading.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Charts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Historical Data</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={timeRange === '1h' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange('1h')}
                    >
                      1H
                    </Button>
                    <Button
                      variant={timeRange === '24h' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange('24h')}
                    >
                      24H
                    </Button>
                    <Button
                      variant={timeRange === '7d' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange('7d')}
                    >
                      7D
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {readingsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : Object.keys(chartData).length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No readings available for the selected time range.
                  </div>
                ) : (
                  <Tabs defaultValue={Object.keys(chartData)[0]} className="w-full">
                    <TabsList className="grid w-full grid-cols-auto overflow-x-auto">
                      {Object.keys(chartData).map((sensorType) => (
                        <TabsTrigger key={sensorType} value={sensorType}>
                          {getSensorName(sensorType)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {Object.entries(chartData).map(([sensorType, data]) => (
                      <TabsContent key={sensorType} value={sensorType} className="mt-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="label"
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              label={{
                                value: getSensorUnit(sensorType),
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: 'hsl(var(--muted-foreground))' },
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                              }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name={getSensorName(sensorType)}
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetailPage;
