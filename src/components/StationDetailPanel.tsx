import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';
import { useLatestReading } from '@/hooks/useStationReadings';
import { formatSensorValue, getSensorName, getStatusColor } from '@/lib/weatherUtils';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';

interface StationDetailPanelProps {
  station: WeatherStationMetadata;
  onClose: () => void;
}

export function StationDetailPanel({ station, onClose }: StationDetailPanelProps) {
  const { data: latestReading, isLoading } = useLatestReading(station.pubkey);

  const npub = nip19.npubEncode(station.pubkey);

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-background border-l border-border shadow-2xl z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{station.name || 'Unnamed Station'}</h2>
            {station.description && (
              <p className="text-sm text-muted-foreground mt-1">{station.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Location Info */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {station.geohash && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geohash:</span>
                <span className="font-mono">{station.geohash}</span>
              </div>
            )}
            {station.lat !== undefined && station.lng !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coordinates:</span>
                <span className="font-mono">
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

        {/* Hardware Info */}
        <Card className="mb-4">
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
        <Card className="mb-4">
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
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Latest Reading</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : latestReading ? (
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
            ) : (
              <div className="text-sm text-muted-foreground">No readings available</div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link to={`/${npub}`}>
            <Button variant="default" className="w-full">
              View Full Details & History
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <div className="font-mono break-all">{npub}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
