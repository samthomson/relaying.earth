import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

import type { WeatherStationMetadata } from '@/lib/weatherUtils';
import { computeSubSolarPoint } from '@/lib/sun';

interface WeatherGlobeProps {
  stations: WeatherStationMetadata[];
  onStationClick?: (station: WeatherStationMetadata) => void;
  /** Optional override for highlighted (selected) station pubkey. */
  highlightedPubkey?: string | null;
}

// Asset URLs. The `three-globe` example assets are served by unpkg; CSP allows
// https for img-src so they load fine. These are NASA Blue Marble + Black
// Marble (night lights) + topology (used as a bump map).
const DAY_TEXTURE_URL =
  'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const NIGHT_TEXTURE_URL =
  'https://unpkg.com/three-globe/example/img/earth-night.jpg';
const BUMP_TEXTURE_URL =
  'https://unpkg.com/three-globe/example/img/earth-topology.png';

// Custom shader that blends day and night textures based on the real-time sun
// position. The terminator is softened with a smoothstep so the sunrise /
// sunset line is realistic-looking rather than knife-edged.
const DAY_NIGHT_VERTEX = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DAY_NIGHT_FRAGMENT = /* glsl */ `
  #define PI 3.141592653589793
  uniform sampler2D uDayTexture;
  uniform sampler2D uNightTexture;
  uniform vec2 uSunLatLng; // (lat, lng) in degrees
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  // three-globe's lat/lng -> unit vector convention
  vec3 polar2Cartesian(in float lat, in float lng) {
    float phi = (90.0 - lat) * PI / 180.0;
    float theta = (90.0 - lng) * PI / 180.0;
    return vec3(
      sin(phi) * cos(theta),
      cos(phi),
      sin(phi) * sin(theta)
    );
  }

  void main() {
    vec3 sunDir = polar2Cartesian(uSunLatLng.x, uSunLatLng.y);
    float intensity = dot(normalize(vWorldNormal), sunDir);
    // Soft terminator (~10° wide on each side)
    float dayMix = smoothstep(-0.18, 0.18, intensity);

    vec4 day = texture2D(uDayTexture, vUv);
    vec4 night = texture2D(uNightTexture, vUv);
    // Slightly boost city lights so they read well at low angles.
    night.rgb *= 1.5;

    gl_FragColor = mix(night, day, dayMix);
  }
`;

interface StationPoint {
  lat: number;
  lng: number;
  station: WeatherStationMetadata;
}

export function WeatherGlobe({
  stations,
  onStationClick,
  highlightedPubkey = null,
}: WeatherGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hovered, setHovered] = useState<{
    station: WeatherStationMetadata;
    screen: { x: number; y: number };
  } | null>(null);

  // Container resize observer.
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

  // Custom day/night globe material. Built once; textures load asynchronously.
  const globeMaterial = useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    const dayTexture = loader.load(DAY_TEXTURE_URL);
    const nightTexture = loader.load(NIGHT_TEXTURE_URL);
    dayTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: { value: dayTexture },
        uNightTexture: { value: nightTexture },
        uSunLatLng: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: DAY_NIGHT_VERTEX,
      fragmentShader: DAY_NIGHT_FRAGMENT,
    });
  }, []);

  // Dispose the material's textures + material when the component unmounts.
  useEffect(() => {
    return () => {
      const uniforms = globeMaterial.uniforms;
      (uniforms.uDayTexture.value as THREE.Texture | undefined)?.dispose();
      (uniforms.uNightTexture.value as THREE.Texture | undefined)?.dispose();
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  // Keep the sun-position uniform in sync with real wall-clock time. The sun
  // moves slowly (15°/hour) so a 30-second tick is plenty.
  useEffect(() => {
    const update = () => {
      const { lat, lng } = computeSubSolarPoint(new Date());
      const v = globeMaterial.uniforms.uSunLatLng.value as THREE.Vector2;
      v.set(lat, lng);
    };
    update();
    const id = window.setInterval(update, 30 * 1000);
    return () => window.clearInterval(id);
  }, [globeMaterial]);

  // Configure orbit controls once the globe is ready.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enableRotate = true;
    controls.enableZoom = true;
    // Right-drag pan is meaningless on a globe (just moves the target off
    // centre); disable it so users can't accidentally lose the planet.
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.9;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.minDistance = 180;
    controls.maxDistance = 700;
    // Initial view: tilted slightly so the user sees both poles a little
    globe.pointOfView({ lat: 18, lng: 12, altitude: 2.4 }, 0);
  }, [size.width, size.height]);

  // Pause auto-rotation while the user is interacting.
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

  // Map stations -> globe-friendly points.
  const points = useMemo<StationPoint[]>(() => {
    return stations
      .filter(
        (s): s is WeatherStationMetadata & { lat: number; lng: number } =>
          s.lat !== undefined && s.lng !== undefined,
      )
      .map((s) => ({ lat: s.lat, lng: s.lng, station: s }));
  }, [stations]);

  // Track the screen position of the hovered point so the tooltip can follow
  // the marker even as the globe spins.
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
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        animateIn={false}
        backgroundColor="rgba(0,0,0,0)"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        globeMaterial={globeMaterial}
        bumpImageUrl={BUMP_TEXTURE_URL}
        showAtmosphere
        atmosphereColor="#ff7a1a"
        atmosphereAltitude={0.18}
        // Stations as bright orange dots sitting just above the surface
        pointsData={points}
        pointLat={(d) => (d as StationPoint).lat}
        pointLng={(d) => (d as StationPoint).lng}
        pointAltitude={0.01}
        pointRadius={(d) => {
          const p = d as StationPoint;
          return p.station.pubkey === highlightedPubkey ? 0.55 : 0.32;
        }}
        pointColor={(d) => {
          const p = d as StationPoint;
          return p.station.pubkey === highlightedPubkey
            ? '#ffd28a'
            : '#ff7a1a';
        }}
        pointResolution={18}
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
        // Radar-style transmission rings expanding from each station
        ringsData={points}
        ringLat={(d) => (d as StationPoint).lat}
        ringLng={(d) => (d as StationPoint).lng}
        ringAltitude={0.006}
        ringMaxRadius={3.2}
        ringPropagationSpeed={1.4}
        ringRepeatPeriod={2400}
        ringResolution={64}
        ringColor={() => (t: number) =>
          `rgba(255, 122, 26, ${Math.max(0, (1 - t) * 0.85)})`}
      />

      {/* Hover tooltip rendered as a normal React component so it picks up
          all of the project's brand styling. */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-lg border border-primary/40 bg-background/95 px-4 py-3 text-sm text-foreground shadow-2xl shadow-black/40 backdrop-blur"
          style={{
            left: hovered.screen.x,
            top: hovered.screen.y,
            maxWidth: 260,
          }}
        >
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
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
            <span className="font-mono uppercase tracking-widest text-primary">
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

      {/* Hidden — keep the npub of the hovered point reachable to screen
          readers in case the user is tabbing rather than mouse-hovering. */}
      {hovered && (
        <span className="sr-only">
          {nip19.npubEncode(hovered.station.pubkey)}
        </span>
      )}
    </div>
  );
}
