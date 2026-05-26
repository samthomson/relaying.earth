import { useEffect, useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link, useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import {
  ArrowLeft,
  MapPin,
  Activity,
  Cpu,
  Radio,
  Calendar,
  Zap,
  Wifi,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useWeatherStation } from '@/hooks/useWeatherStations';
import { useStationReadings } from '@/hooks/useStationReadings';
import {
  getSensorName,
  formatSensorValue,
  getSensorUnit,
} from '@/lib/weatherUtils';
import {
  formatRelativeTime,
  formatAbsoluteTime,
} from '@/lib/timeUtils';

type TimeRange = '1h' | '24h' | '7d';

const TIME_RANGE_CONFIG: Record<TimeRange, { seconds: number; readingLimit: number; label: string }> = {
  '1h': { seconds: 3600, readingLimit: 120, label: 'Last hour' },
  '24h': { seconds: 86400, readingLimit: 300, label: 'Last 24h' },
  '7d': { seconds: 604800, readingLimit: 1500, label: 'Last 7 days' },
};

const StationDetailPage = () => {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [activeSensor, setActiveSensor] = useState<string | null>(null);

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

  // Lower bound of the readings query; kept in state so rendering stays pure
  // (no Date.now() called during render). It is recomputed whenever the user
  // changes the time range and refreshed every minute so the chart window
  // slides forward as new readings come in.
  const [since, setSince] = useState(
    () => Math.floor(Date.now() / 1000) - TIME_RANGE_CONFIG[timeRange].seconds,
  );
  useEffect(() => {
    const update = () => {
      setSince(Math.floor(Date.now() / 1000) - TIME_RANGE_CONFIG[timeRange].seconds);
    };
    update();
    const id = window.setInterval(update, 60 * 1000);
    return () => window.clearInterval(id);
  }, [timeRange]);

  const { data: station, isLoading: stationLoading } = useWeatherStation(pubkey);
  const { data: readings, isLoading: readingsLoading } = useStationReadings({
    pubkey,
    since,
    limit: TIME_RANGE_CONFIG[timeRange].readingLimit,
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
    if (!readings) return [];
    const set = new Set<string>();
    readings.forEach((reading) => reading.readings.forEach((r) => set.add(r.type)));
    return Array.from(set);
  }, [readings]);

  // Default-select first sensor type when one becomes available
  const selectedSensor = activeSensor && sensorTypes.includes(activeSensor)
    ? activeSensor
    : sensorTypes[0] ?? null;

  const chartData = useMemo(() => {
    if (!readings || !selectedSensor) return [];
    return readings
      .map((reading) => {
        const point = reading.readings.find((r) => r.type === selectedSensor);
        if (!point) return null;
        const value = parseFloat(point.value);
        if (isNaN(value)) return null;
        return {
          timestamp: reading.timestamp,
          value,
          label: new Date(reading.timestamp * 1000).toLocaleString([], {
            month: timeRange === '7d' ? 'short' : undefined,
            day: timeRange === '7d' ? '2-digit' : undefined,
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      })
      .filter((p): p is { timestamp: number; value: number; label: string } => p !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [readings, selectedSensor, timeRange]);

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

  const okSensors = station.sensors.filter(
    (s) =>
      !station.sensorStatuses.find(
        (st) => st.type === s.type && st.model === s.model && st.status !== 'ok',
      ),
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-x-0 -top-32 h-72 bg-[radial-gradient(circle_at_30%_50%,color-mix(in_oklab,var(--brand-orange)_22%,transparent),transparent_60%)]" />
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
                  Updated {formatRelativeTime(station.event.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Latest readings strip */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Sensors"
              value={`${okSensors}/${station.sensors.length}`}
              hint="reporting ok"
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
                  ? formatRelativeTime(latestReading.timestamp)
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
            <Panel icon={<Radio className="h-3.5 w-3.5" />} title="Latest reading">
              {readingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : latestReading ? (
                <>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {formatRelativeTime(latestReading.timestamp)}
                  </p>
                  <ul className="space-y-2">
                    {latestReading.readings.map((reading, idx) => (
                      <li
                        key={`${reading.type}-${idx}`}
                        className="flex items-baseline justify-between border-b border-border/40 pb-1.5 text-sm last:border-b-0 last:pb-0"
                      >
                        <span className="text-muted-foreground">
                          {getSensorName(reading.type)}
                        </span>
                        <span className="font-display font-semibold text-foreground">
                          {formatSensorValue(reading.type, reading.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No readings yet.</p>
              )}
            </Panel>

            <Panel icon={<Cpu className="h-3.5 w-3.5" />} title="Sensors">
              {station.sensors.length === 0 ? (
                <p className="text-xs text-muted-foreground">None declared.</p>
              ) : (
                <ul className="space-y-2">
                  {station.sensors.map((sensor, idx) => {
                    const status = station.sensorStatuses.find(
                      (s) => s.type === sensor.type && s.model === sensor.model,
                    );
                    const ok = !status || status.status === 'ok';
                    return (
                      <li
                        key={`${sensor.type}-${idx}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate">{getSensorName(sensor.type)}</div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                            {sensor.model}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            ok
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-destructive/40 bg-destructive/10 text-destructive'
                          }
                        >
                          {ok ? 'OK' : 'Fault'}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel icon={<MapPin className="h-3.5 w-3.5" />} title="Identity">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pubkey</span>
                  <span className="font-mono text-[11px]">
                    {station.pubkey.slice(0, 8)}…{station.pubkey.slice(-6)}
                  </span>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/40 p-2 font-mono text-[10px] break-all text-muted-foreground">
                  {nip19.npubEncode(station.pubkey)}
                </div>
              </div>
            </Panel>
          </div>

          {/* Charts column */}
          <div className="space-y-4">
            <Card className="bg-card/60">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    History
                  </div>
                  <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-0.5">
                    {(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTimeRange(k)}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                          timeRange === k
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {k.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {sensorTypes.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {sensorTypes.map((type) => {
                      const isActive = selectedSensor === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setActiveSensor(type)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            isActive
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                          }`}
                        >
                          {getSensorName(type)}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6">
                  {readingsLoading ? (
                    <Skeleton className="h-80 w-full" />
                  ) : !selectedSensor ? (
                    <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                      No readings in the selected window.
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                      No {getSensorName(selectedSensor)} data in this window.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                      >
                        <defs>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--brand-orange)" />
                            <stop offset="100%" stopColor="var(--brand-purple)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 6"
                          stroke="var(--border)"
                          opacity={0.6}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickLine={false}
                          minTickGap={48}
                        />
                        <YAxis
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickLine={false}
                          width={56}
                          label={{
                            value: getSensorUnit(selectedSensor),
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: 'var(--muted-foreground)', fontSize: 11 },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: 'var(--foreground)' }}
                          itemStyle={{ color: 'var(--primary)' }}
                          formatter={(value) => [
                            formatSensorValue(
                              selectedSensor,
                              typeof value === 'number' ? value.toString() : String(value),
                            ),
                            getSensorName(selectedSensor),
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="url(#lineGradient)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: 'var(--brand-orange)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent events table */}
            <Card className="bg-card/60">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Recent events
                </div>
                {readingsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !readings || readings.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No events in this window.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                          <th className="py-2 pr-4 font-normal">When</th>
                          <th className="py-2 pr-4 font-normal">Readings</th>
                          <th className="py-2 font-normal text-right">Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings.slice(0, 12).map((reading) => (
                          <tr
                            key={reading.event.id}
                            className="border-b border-border/40 last:border-b-0"
                          >
                            <td className="py-2 pr-4 align-top">
                              <div className="font-medium">
                                {formatRelativeTime(reading.timestamp)}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {formatAbsoluteTime(reading.timestamp)}
                              </div>
                            </td>
                            <td className="py-2 pr-4">
                              <div className="flex flex-wrap gap-1.5">
                                {reading.readings.map((r, idx) => (
                                  <span
                                    key={`${r.type}-${idx}`}
                                    className="inline-flex items-baseline gap-1 rounded border border-border/70 bg-background px-1.5 py-0.5 text-[11px]"
                                  >
                                    <span className="text-muted-foreground">
                                      {getSensorName(r.type)}
                                    </span>
                                    <span className="font-mono font-semibold text-foreground">
                                      {formatSensorValue(r.type, r.value)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 text-right align-top font-mono text-[10px] text-muted-foreground">
                              {reading.event.id.slice(0, 8)}…
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card/60">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
          {icon}
          {title}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default StationDetailPage;
