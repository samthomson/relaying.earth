import ngeohash from 'ngeohash';

import { cn } from '@/lib/utils';
import {
  projectToWorld,
  WORLD_LAND_PATH,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from '@/lib/worldOutline';

interface StationMiniMapProps {
  geohash: string;
  lat?: number;
  lng?: number;
  className?: string;
}

interface GeohashCell {
  latitude: number;
  longitude: number;
  error: { latitude: number; longitude: number };
}

function decodeCell(geohash: string): GeohashCell | null {
  try {
    return ngeohash.decode(geohash);
  } catch {
    return null;
  }
}

interface MapProps {
  geohash: string;
  lat: number;
  lng: number;
  className?: string;
}

/** Shared SVG: world outline, geohash cell, station pin. Scales to any width. */
export function StationMapSvg({ geohash, lat, lng, className }: MapProps) {
  const cell = decodeCell(geohash);
  const pin = projectToWorld(lat, lng);

  let cellRect: { x: number; y: number; w: number; h: number } | null = null;
  if (cell) {
    const topLeft = projectToWorld(
      cell.latitude + cell.error.latitude,
      cell.longitude - cell.error.longitude,
    );
    const bottomRight = projectToWorld(
      cell.latitude - cell.error.latitude,
      cell.longitude + cell.error.longitude,
    );
    cellRect = {
      x: topLeft.x,
      y: topLeft.y,
      w: bottomRight.x - topLeft.x,
      h: bottomRight.y - topLeft.y,
    };
  }

  return (
    <svg
      viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
      className={cn('block w-full', className)}
      role="img"
      aria-label={`World map showing station ${geohash} at ${lat.toFixed(2)}, ${lng.toFixed(2)}`}
    >
      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lineLng) => (
        <line
          key={`v${lineLng}`}
          x1={projectToWorld(90, lineLng).x}
          y1={0}
          x2={projectToWorld(90, lineLng).x}
          y2={WORLD_MAP_HEIGHT}
          stroke="var(--border)"
          strokeWidth="0.75"
        />
      ))}
      {[-60, -30, 0, 30, 60].map((lineLat) => (
        <line
          key={`h${lineLat}`}
          x1={0}
          y1={projectToWorld(lineLat, -180).y}
          x2={WORLD_MAP_WIDTH}
          y2={projectToWorld(lineLat, -180).y}
          stroke="var(--border)"
          strokeWidth="0.75"
          strokeDasharray={lineLat === 0 ? 'none' : '3 5'}
        />
      ))}
      <path
        d={WORLD_LAND_PATH}
        fill="hsl(30 14% 12% / 0.12)"
        stroke="hsl(30 14% 12% / 0.25)"
        strokeWidth="0.5"
        fillRule="evenodd"
      />
      {cellRect && (
        <rect
          x={cellRect.x}
          y={cellRect.y}
          width={Math.max(cellRect.w, 4)}
          height={Math.max(cellRect.h, 4)}
          fill="hsl(22 96% 54% / 0.18)"
          stroke="hsl(22 96% 54% / 0.7)"
          strokeWidth="1.5"
        />
      )}
      <circle cx={pin.x} cy={pin.y} r="16" fill="hsl(22 96% 54%)" opacity="0.18" />
      <circle
        cx={pin.x}
        cy={pin.y}
        r="6"
        fill="hsl(22 96% 54%)"
        stroke="#fff"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * Compact inline map. Wrap in `StationMapDialog` to open a larger view on
 * click; the caption keeps a direct external link as a fallback.
 */
export function StationMiniMap({ geohash, lat, lng, className }: StationMiniMapProps) {
  const centerLat = lat ?? decodeCell(geohash)?.latitude;
  const centerLng = lng ?? decodeCell(geohash)?.longitude;

  if (centerLat === undefined || centerLng === undefined) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      <StationMapSvg geohash={geohash} lat={centerLat} lng={centerLng} className="rounded-lg border border-border/60 bg-muted/30" />
      <a
        href={`https://www.openstreetmap.org/?mlat=${centerLat.toFixed(4)}&mlon=${centerLng.toFixed(4)}#map=11/${centerLat.toFixed(4)}/${centerLng.toFixed(4)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
      >
        {geohash} · {centerLat.toFixed(3)}, {centerLng.toFixed(3)}
      </a>
    </div>
  );
}
