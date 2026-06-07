import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

import { useIsMobile } from '@/hooks/useIsMobile';
import { brandColors } from '@/lib/brandColors';
import type { WeatherStationMetadata } from '@/lib/weatherUtils';

const EARTH_TEXTURE_URL = '/textures/earth-blue-marble.jpg';

interface WeatherGlobeProps {
  stations: WeatherStationMetadata[];
  onStationClick?: (station: WeatherStationMetadata) => void;
  /** Optional override for highlighted (selected) station pubkey. */
  highlightedPubkey?: string | null;
}

interface StationPoint {
  lat: number;
  lng: number;
  station: WeatherStationMetadata;
}

function findGlobeMaterial(globe: GlobeMethods): THREE.MeshPhongMaterial | undefined {
  let found: THREE.MeshPhongMaterial | undefined;
  globe.scene().traverse((obj) => {
    if (found) return;
    if (
      obj instanceof THREE.Mesh &&
      obj.material instanceof THREE.MeshPhongMaterial &&
      obj.material.map
    ) {
      found = obj.material;
    }
  });
  return found;
}

function brightenGlobeMaterial(globe: GlobeMethods): boolean {
  const material = findGlobeMaterial(globe);
  if (!material?.map) return false;
  material.emissiveMap = material.map;
  material.emissive = new THREE.Color(0xffffff);
  material.emissiveIntensity = 0.55;
  material.shininess = 6;
  material.needsUpdate = true;
  return true;
}

/** Texture loads async — retry until the map is available. */
function scheduleGlobeBrighten(globe: GlobeMethods) {
  let attempts = 0;
  const tryBrighten = () => {
    if (brightenGlobeMaterial(globe) || attempts >= 40) return;
    attempts += 1;
    window.setTimeout(tryBrighten, 100);
  };
  tryBrighten();
}

export function WeatherGlobe({
  stations,
  onStationClick,
  highlightedPubkey = null,
}: WeatherGlobeProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hovered, setHovered] = useState<{
    station: WeatherStationMetadata;
    screen: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.9;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.minDistance = 120;
    controls.maxDistance = 700;
    controls.enableRotate = !isMobile;
    globe.pointOfView({ lat: 20, lng: -30, altitude: 0.85 }, 0);
  }, [size.width, size.height, isMobile]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();

    let resumeTimer: number | null = null;
    const pause = () => {
      controls.autoRotate = false;
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };
    const resume = () => {
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 2500);
    };
    controls.addEventListener('start', pause);
    controls.addEventListener('end', resume);
    return () => {
      controls.removeEventListener('start', pause);
      controls.removeEventListener('end', resume);
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };
  }, [size.width, size.height]);

  const points = useMemo<StationPoint[]>(() => {
    return stations
      .filter(
        (s): s is WeatherStationMetadata & { lat: number; lng: number } =>
          s.lat !== undefined && s.lng !== undefined,
      )
      .map((s) => ({ lat: s.lat, lng: s.lng, station: s }));
  }, [stations]);

  useEffect(() => {
    if (!hovered) return;
    const globe = globeRef.current;
    if (!globe) return;
    const update = () => {
      const { lat, lng } = hovered.station;
      if (lat === undefined || lng === undefined) return;
      const screen = globe.getScreenCoords(lat, lng, 0.02);
      if (
        screen &&
        Number.isFinite(screen.x) &&
        Number.isFinite(screen.y)
      ) {
        setHovered((h) => (h ? { ...h, screen } : h));
      }
    };
    const id = window.setInterval(update, 80);
    return () => window.clearInterval(id);
  }, [hovered?.station.pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden max-md:touch-pan-y"
    >
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        animateIn={false}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={EARTH_TEXTURE_URL}
        showAtmosphere={false}
        onGlobeReady={() => {
          const globe = globeRef.current;
          if (globe) scheduleGlobeBrighten(globe);
        }}
        pointsData={points}
        pointLat={(d) => (d as StationPoint).lat}
        pointLng={(d) => (d as StationPoint).lng}
        pointAltitude={0.02}
        pointRadius={(d) => {
          const p = d as StationPoint;
          return p.station.pubkey === highlightedPubkey ? 0.65 : 0.4;
        }}
        pointColor={(d) => {
          const p = d as StationPoint;
          return p.station.pubkey === highlightedPubkey
            ? brandColors.orangeHex
            : brandColors.maroonHex;
        }}
        pointResolution={20}
        pointsMerge={false}
        onPointHover={(point, _prev) => {
          if (point) {
            const p = point as unknown as StationPoint;
            const globe = globeRef.current;
            const screen = globe?.getScreenCoords(p.lat, p.lng, 0.02);
            if (screen) {
              setHovered({ station: p.station, screen });
            }
          } else {
            setHovered(null);
          }
        }}
        onPointClick={(point, _event) => {
          const p = point as unknown as StationPoint;
          onStationClick?.(p.station);
        }}
        ringsData={points}
        ringLat={(d) => (d as StationPoint).lat}
        ringLng={(d) => (d as StationPoint).lng}
        ringAltitude={0.008}
        ringMaxRadius={3.2}
        ringPropagationSpeed={1.4}
        ringRepeatPeriod={2400}
        ringResolution={64}
        ringColor={() => (t: number) => {
          const alpha = Math.max(0, (1 - t) * 0.55);
          return `hsla(348, 58%, 48%, ${alpha})`;
        }}
      />

      {hovered && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-lg border border-border bg-background/95 px-4 py-3 text-sm text-foreground shadow-2xl shadow-black/40 backdrop-blur"
          style={{
            left: hovered.screen.x,
            top: hovered.screen.y,
            maxWidth: 260,
          }}
        >
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand-maroon">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-maroon opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-maroon" />
            </span>
            Relaying
          </div>
          <div className="mt-1 font-display text-base font-semibold leading-tight">
            {hovered.station.name || 'Unnamed station'}
          </div>
          {hovered.station.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {hovered.station.description}
            </div>
          )}
          {hovered.station.geohash && (
            <div className="mt-2 font-mono text-[11px] text-muted-foreground">
              ◉ {hovered.station.geohash}
            </div>
          )}
          <div className="mt-2 text-[11px] text-muted-foreground">
            Click to open
          </div>
        </div>
      )}

      {points.length === 0 && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
          <div className="pointer-events-auto rounded-full border border-border bg-background/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
            <span className="font-mono uppercase tracking-widest text-foreground">
              No stations yet
            </span>
            <span className="mx-2 text-border">·</span>
            <Link
              to="/stations"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              Learn how to deploy one
            </Link>
          </div>
        </div>
      )}

      {hovered && (
        <span className="sr-only">
          {nip19.npubEncode(hovered.station.pubkey)}
        </span>
      )}
    </div>
  );
}
