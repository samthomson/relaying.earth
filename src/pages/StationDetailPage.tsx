import { useEffect, useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link, useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import {
  ArrowLeft,
  MapPin,
  Cpu,
  Radio,
  Calendar,
  Zap,
  Wifi,
  Clock,
} from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RainForecastPanel } from '@/components/RainForecastPanel';
import { StationHistoryChart } from '@/components/StationHistoryChart';

import { useWeatherStation } from '@/hooks/useWeatherStations';
import { useStationReadings } from '@/hooks/useStationReadings';
import { useStationChartReadings } from '@/hooks/useStationChartReadings';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import { useNow } from '@/hooks/useNow';
import { LatestReadingList } from '@/components/LatestReadingList';
import { ReadingsTable } from '@/components/ReadingsTable';
import { IdentityRows } from '@/components/IdentityRows';
import { StationSensorList } from '@/components/StationSensorList';
import { SensorInterpretationGuide } from '@/components/SensorInterpretationGuide';
import { StationLocalTimePanel } from '@/components/StationLocalTimePanel';
import {
  decodeGeohash,
  groupStationSensors,
} from '@/lib/weatherUtils';
import { getStationCoordinates, getStationTimezone } from '@/lib/stationTime';
import { StationMiniMap } from '@/components/StationMiniMap';
import { StationMapDialog } from '@/components/StationMapDialog';
import {
  CHART_TIME_RANGE_CONFIG,
  type ChartTimeRange,
} from '@/lib/chartUtils';
import {
  formatRelativeTime,
  formatAbsoluteTime,
} from '@/lib/timeUtils';

const StationDetailPage = () => {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  const now = useNow(1000);
  const { formatDisplayNumber, getSensorUnit, toDisplayNumber } = useWeatherFormatters();

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

  const [timeRange, setTimeRange] = useState<ChartTimeRange>('24h');
  const [visibleEvents, setVisibleEvents] = useState(20);
  const [visibleEventsPubkey, setVisibleEventsPubkey] = useState<string | undefined>(
    undefined,
  );
  if (visibleEventsPubkey !== pubkey) {
    // Station changed — reset table pagination during render (React pattern
    // for adjusting state when a prop changes).
    setVisibleEventsPubkey(pubkey);
    setVisibleEvents(20);
  }
  const [chartWindow, setChartWindow] = useState(() => {
    const start = Math.floor(Date.now() / 1000);
    return {
      since: start - CHART_TIME_RANGE_CONFIG['24h'].seconds,
      until: start,
    };
  });

  const { since, until: chartUntil } = chartWindow;
  useEffect(() => {
    const update = () => {
      const windowEnd = Math.floor(Date.now() / 1000);
      setChartWindow({
        since: windowEnd - CHART_TIME_RANGE_CONFIG[timeRange].seconds,
        until: windowEnd,
      });
    };
    update();
    const id = window.setInterval(update, 60 * 1000);
    return () => window.clearInterval(id);
  }, [timeRange]);

  const { data: station, isLoading: stationLoading } = useWeatherStation(pubkey);
  const { data: readings, isLoading: readingsLoading } = useStationReadings({
    pubkey,
    limit: 120,
  });
  const { data: chartReadings, isLoading: chartReadingsLoading } = useStationChartReadings({
    pubkey,
    timeRange,
    until: chartUntil,
  });

  useSeoMeta({
    title: station?.name
      ? `${station.name} — relaying.earth`
      : 'Station — relaying.earth',
    description:
      station?.description ||
      'View live and historical readings from a Nostr weather station.',
  });

  const sensorTypes = useMemo(() => {
    const source = chartReadings ?? readings;
    if (!source) return [];
    const set = new Set<string>();
    source.forEach((reading) => reading.readings.forEach((r) => set.add(r.type)));
    return Array.from(set);
  }, [chartReadings, readings]);

  const latestReading = readings?.[0];

  if (!pubkey) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Invalid station identifier. Check the URL.
              </p>
              <Link to="/">
                <Button className="mt-4">Back home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stationLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-3 h-10 w-2/3 max-w-xl" />
          <Skeleton className="mt-2 h-5 w-1/2 max-w-md" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Station not found. It may not have published metadata yet, or the relays
                this client knows about haven't seen it.
              </p>
              <Link to="/stations">
                <Button variant="outline" className="mt-4">
                  Browse all stations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const sensorGroups = groupStationSensors(station);
  const okSensors = sensorGroups.filter((group) => group.ok).length;

  const npub = nip19.npubEncode(station.pubkey);
  const stationCoords = getStationCoordinates(station);
  const stationTimeZone = stationCoords
    ? getStationTimezone(stationCoords.lat, stationCoords.lng)
    : undefined;
  const mapLat = station.lat ?? decodeGeohash(station.geohash ?? '')?.lat;
  const mapLng = station.lng ?? decodeGeohash(station.geohash ?? '')?.lng;
  const eventRows = (readings ?? []).filter((reading) => reading.timestamp >= since);
  const shownEventRows = eventRows.slice(0, visibleEvents);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <Link
            to="/stations"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All stations
          </Link>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-primary">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Relaying · station
              </div>
              <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {station.name || 'Unnamed station'}
              </h1>
              {station.description && (
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {station.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {station.geohash && (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <MapPin className="h-3.5 w-3.5" />
                    {station.geohash}
                    {station.lat !== undefined && station.lng !== undefined && (
                      <span className="text-muted-foreground/70">
                        ({station.lat.toFixed(3)}, {station.lng.toFixed(3)})
                      </span>
                    )}
                  </span>
                )}
                {station.elevation !== undefined && (
                  <span>{station.elevation} m</span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Updated {formatRelativeTime(station.event.created_at, now.getTime())}
                </span>
              </div>
            </div>
          </div>

          {/* Latest readings strip */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Sensors"
              value={`${okSensors}/${sensorGroups.length}`}
              hint={`reporting ok · ${station.sensors.length} measurements`}
            />
            <StatTile
              label="Power"
              value={station.power || '—'}
              icon={<Zap className="h-3.5 w-3.5 text-primary" />}
            />
            <StatTile
              label="Connectivity"
              value={station.connectivity || '—'}
              icon={<Wifi className="h-3.5 w-3.5 text-primary" />}
            />
            <StatTile
              label="Last reading"
              value={
                latestReading
                  ? formatRelativeTime(latestReading.timestamp, now.getTime())
                  : readingsLoading
                    ? '…'
                    : '—'
              }
              hint={
                latestReading
                  ? formatAbsoluteTime(latestReading.timestamp)
                  : undefined
              }
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left rail */}
          <div className="space-y-4">
            <Panel icon={<MapPin className="h-3.5 w-3.5" />} title="Identity">
              <IdentityRows
                pubkey={station.pubkey}
                npub={npub}
                deviceId={station.deviceId}
              />
            </Panel>

            <Panel
              icon={<Radio className="h-3.5 w-3.5" />}
              title="Latest reading"
              action={<SensorInterpretationGuide />}
            >
              {readingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : latestReading ? (
                <>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {formatRelativeTime(latestReading.timestamp, now.getTime())}
                  </p>
                  <LatestReadingList readings={latestReading.readings} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No readings yet.</p>
              )}
            </Panel>

            <Panel icon={<Clock className="h-3.5 w-3.5" />} title="Location & time">
              <div className="mb-3 space-y-1.5 text-sm">
                {station.geohash && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Geohash</span>
                    <span className="font-mono text-xs">{station.geohash}</span>
                  </div>
                )}
                {station.lat !== undefined && station.lng !== undefined && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Coords</span>
                    <span className="font-mono text-xs">
                      {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                    </span>
                  </div>
                )}
                {station.elevation !== undefined && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Elevation</span>
                    <span>{station.elevation} m</span>
                  </div>
                )}
              </div>
              {station.geohash && mapLat !== undefined && mapLng !== undefined && (
                <StationMapDialog geohash={station.geohash} lat={mapLat} lng={mapLng}>
                  <StationMiniMap geohash={station.geohash} lat={mapLat} lng={mapLng} />
                </StationMapDialog>
              )}
              <div className="mt-3">
                <StationLocalTimePanel station={station} />
              </div>
            </Panel>

            <Panel icon={<Cpu className="h-3.5 w-3.5" />} title={`Sensors (${sensorGroups.length})`}>
              <StationSensorList station={station} />
            </Panel>
          </div>

          {/* Charts column */}
          <div className="space-y-4">
            <RainForecastPanel
              readings={readings}
              readingsLoading={readingsLoading}
              hasPressureSensor={station.sensors.some((sensor) => sensor.type === 'pressure')}
              lat={station.lat}
            />

            <StationHistoryChart
              readings={chartReadings}
              readingsLoading={chartReadingsLoading}
              timeRange={timeRange}
              since={since}
              until={chartUntil}
              sensorTypes={sensorTypes}
              formatDisplayNumber={formatDisplayNumber}
              getSensorUnit={getSensorUnit}
              toDisplayNumber={toDisplayNumber}
              onTimeRangeChange={setTimeRange}
              stationTimeZone={stationTimeZone}
            />

            {/* Recent events table */}
            <Card className="bg-card/60">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Recent events
                  </div>
                  <SensorInterpretationGuide />
                </div>
                {readingsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : eventRows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No events in this window.
                  </p>
                ) : (
                  <>
                    <ReadingsTable
                      now={now}
                      layout="events"
                      rows={shownEventRows.map((reading) => ({
                        id: reading.event.id,
                        timestamp: reading.timestamp,
                        readings: reading.readings,
                        eventId: reading.event.id,
                      }))}
                      sensorTypes={sensorTypes}
                    />
                    {eventRows.length > shownEventRows.length && (
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          Showing {shownEventRows.length} of {eventRows.length} events — the
                          rest are already loaded
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVisibleEvents((count) => count + 20)}
                        >
                          Load earlier
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-card/60 px-4 py-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-display text-xl font-semibold leading-tight">{value}</div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function Panel({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card/60">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
            {icon}
            {title}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default StationDetailPage;
