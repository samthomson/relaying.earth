import { X, MapPin, Activity, Cpu, Radio, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';
import { useLatestReading } from '@/hooks/useStationReadings';
import { ReadingAgeBadge } from '@/components/ReadingAgeBadge';
import { LatestReadingList, SensorSummary } from '@/components/LatestReadingList';
import { SensorInterpretationGuide } from '@/components/SensorInterpretationGuide';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';

interface StationDetailPanelProps {
  station: WeatherStationMetadata;
  onClose: () => void;
}

export function StationDetailPanel({ station, onClose }: StationDetailPanelProps) {
  const { data: latestReading, isLoading } = useLatestReading(station.pubkey);
  const npub = nip19.npubEncode(station.pubkey);
  const okSensors = station.sensors.filter(
    (s) =>
      !station.sensorStatuses.find(
        (st) => st.type === s.type && st.model === s.model && st.status !== 'ok',
      ),
  ).length;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col overflow-hidden border-l border-border bg-background/95 shadow-2xl shadow-black/60 backdrop-blur"
      aria-label="Station details"
    >
      <div className="flex items-start justify-between border-b border-border px-6 py-5">
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-primary">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Relaying
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold leading-tight">
            {station.name || 'Unnamed station'}
          </h2>
          {station.description && (
            <p className="mt-1 text-sm text-muted-foreground">{station.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <Section
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Latest reading"
            action={<SensorInterpretationGuide />}
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Section>
        ) : latestReading ? (
          <Section
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Latest reading"
            meta={
              <ReadingAgeBadge timestamp={latestReading.timestamp} />
            }
            action={<SensorInterpretationGuide />}
          >
            <LatestReadingList readings={latestReading.readings} />
          </Section>
        ) : (
          <Section
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Latest reading"
            action={<SensorInterpretationGuide />}
          >
            <p className="text-xs text-muted-foreground">No readings published yet.</p>
          </Section>
        )}

        <Section icon={<Radio className="h-3.5 w-3.5" />} label="Sensors">
          <SensorSummary sensorCount={station.sensors.length} okCount={okSensors} />
        </Section>

        <Section icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
          <Row label="Geohash" value={station.geohash || '—'} mono />
          {station.lat !== undefined && station.lng !== undefined && (
            <Row
              label="Coords"
              value={`${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}`}
              mono
            />
          )}
          {station.elevation !== undefined && (
            <Row label="Elevation" value={`${station.elevation} m`} />
          )}
        </Section>

        <Section icon={<Cpu className="h-3.5 w-3.5" />} label="Hardware">
          {station.power && <Row label="Power" value={station.power} pill />}
          {station.connectivity && (
            <Row label="Connectivity" value={station.connectivity} pill />
          )}
          {!station.power && !station.connectivity && (
            <p className="text-xs text-muted-foreground">Not declared</p>
          )}
        </Section>
      </div>

      <div className="border-t border-border px-6 py-4">
        <Link to={`/${npub}`} className="block">
          <Button className="w-full justify-between">
            View full station
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <div className="mt-3 break-all font-mono text-[10px] leading-relaxed text-muted-foreground">
          {npub}
        </div>
      </div>
    </aside>
  );
}

function Section({
  icon,
  label,
  meta,
  action,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
          {icon}
          {label}
          {meta}
        </div>
        {action}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
  pill = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  pill?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {pill ? (
        <Badge variant="outline" className="border-border/80 bg-muted/40 text-foreground">
          {value}
        </Badge>
      ) : (
        <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
      )}
    </div>
  );
}
