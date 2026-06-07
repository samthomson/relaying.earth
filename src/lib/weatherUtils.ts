import geohash from 'ngeohash';
import type { NostrEvent } from '@nostrify/nostrify';

export const WEATHER_STATION_METADATA_KIND = 16158;
export const WEATHER_READING_KIND = 4223;
export const WEATHER_STATION_LIST_KIND = 36643;

export interface WeatherStationMetadata {
  pubkey: string;
  name?: string;
  description?: string;
  geohash?: string;
  lat?: number;
  lng?: number;
  elevation?: number;
  power?: string;
  connectivity?: string;
  sensors: Array<{ type: string; model: string }>;
  sensorStatuses: Array<{ type: string; model: string; status: string }>;
  event: NostrEvent;
}

export interface WeatherReading {
  pubkey: string;
  timestamp: number;
  readings: Array<{ type: string; value: string; model: string }>;
  event: NostrEvent;
}

export interface StationList {
  pubkey: string;
  identifier: string;
  title?: string;
  description?: string;
  stations: string[]; // station pubkeys
  event: NostrEvent;
}

/**
 * Decode a geohash to latitude/longitude coordinates
 */
export function decodeGeohash(hash: string): { lat: number; lng: number } | null {
  try {
    const decoded = geohash.decode(hash);
    return { lat: decoded.latitude, lng: decoded.longitude };
  } catch {
    return null;
  }
}

/**
 * Encode lat/lng to geohash with specified precision
 */
export function encodeGeohash(lat: number, lng: number, precision = 5): string {
  return geohash.encode(lat, lng, precision);
}

/**
 * Validate and parse a weather station metadata event (kind:16158)
 */
export function parseStationMetadata(event: NostrEvent): WeatherStationMetadata | null {
  if (event.kind !== WEATHER_STATION_METADATA_KIND) return null;

  const name = event.tags.find(([tag]) => tag === 'name')?.[1];
  const description = event.tags.find(([tag]) => tag === 'description')?.[1];
  const geohashTag = event.tags.find(([tag]) => tag === 'g')?.[1];
  const elevationTag = event.tags.find(([tag]) => tag === 'elevation')?.[1];
  const power = event.tags.find(([tag]) => tag === 'power')?.[1];
  const connectivity = event.tags.find(([tag]) => tag === 'connectivity')?.[1];

  // Decode geohash if present
  let lat: number | undefined;
  let lng: number | undefined;
  if (geohashTag) {
    const coords = decodeGeohash(geohashTag);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  // Parse sensors
  const sensors: Array<{ type: string; model: string }> = [];
  const sensorStatuses: Array<{ type: string; model: string; status: string }> = [];

  for (const tag of event.tags) {
    if (tag[0] === 'sensor' && tag[1] && tag[2]) {
      sensors.push({ type: tag[1], model: tag[2] });
    }
    if (tag[0] === 'sensor_status' && tag[1] && tag[2] && tag[3]) {
      sensorStatuses.push({ type: tag[1], model: tag[2], status: tag[3] });
    }
  }

  return {
    pubkey: event.pubkey,
    name,
    description,
    geohash: geohashTag,
    lat,
    lng,
    elevation: elevationTag ? parseFloat(elevationTag) : undefined,
    power,
    connectivity,
    sensors,
    sensorStatuses,
    event,
  };
}

/**
 * Validate and parse a weather reading event (kind:4223)
 */
export function parseWeatherReading(event: NostrEvent): WeatherReading | null {
  if (event.kind !== WEATHER_READING_KIND) return null;

  const readings: Array<{ type: string; value: string; model: string }> = [];

  for (const tag of event.tags) {
    // Skip non-sensor tags (alt, etc)
    if (tag[0] === 'alt') continue;

    // Sensor readings are 3-parameter tags: [type, value, model]
    if (tag.length === 3 && tag[1] && tag[2]) {
      readings.push({
        type: tag[0],
        value: tag[1],
        model: tag[2],
      });
    }
  }

  // Only valid if we have at least one reading
  if (readings.length === 0) return null;

  return {
    pubkey: event.pubkey,
    timestamp: event.created_at,
    readings,
    event,
  };
}

/**
 * Validate and parse a weather station list event (kind:36643)
 */
export function parseStationList(event: NostrEvent): StationList | null {
  if (event.kind !== WEATHER_STATION_LIST_KIND) return null;

  const identifier = event.tags.find(([tag]) => tag === 'd')?.[1];
  if (!identifier) return null;

  const title = event.tags.find(([tag]) => tag === 'title')?.[1];
  const description = event.tags.find(([tag]) => tag === 'description')?.[1];

  const stations: string[] = [];
  for (const tag of event.tags) {
    if (tag[0] === 'p' && tag[1]) {
      stations.push(tag[1]);
    }
  }

  return {
    pubkey: event.pubkey,
    identifier,
    title,
    description,
    stations,
    event,
  };
}

/**
 * Get a human-readable sensor name
 */
export function getSensorName(type: string): string {
  const names: Record<string, string> = {
    temp: 'Temperature',
    humidity: 'Humidity',
    pm1: 'PM1.0',
    pm25: 'PM2.5',
    pm10: 'PM10',
    air_quality: 'Air Quality',
    light: 'Light',
    co2: 'CO₂',
    gas: 'Gas (TVOC)',
    carbon_monoxide: 'Carbon Monoxide',
    pressure: 'Pressure',
    rain: 'Rain',
  };
  return names[type] || type;
}

/** Abbreviated sensor label for compact layouts. */
export function getSensorShortName(type: string): string {
  const names: Record<string, string> = {
    temp: 'Temp',
    humidity: 'Hum',
    pm1: 'PM1',
    pm25: 'PM2.5',
    pm10: 'PM10',
    air_quality: 'AQ',
    light: 'Light',
    co2: 'CO₂',
    gas: 'TVOC',
    carbon_monoxide: 'CO',
    pressure: 'Press',
    rain: 'Rain',
  };
  return names[type] || type;
}

/** Preferred column order for reading tables. */
export const SENSOR_COLUMN_ORDER = [
  'temp',
  'humidity',
  'pressure',
  'light',
  'rain',
  'pm1',
  'pm25',
  'pm10',
  'air_quality',
  'co2',
  'gas',
  'carbon_monoxide',
] as const;

export function sortSensorTypes(types: Iterable<string>): string[] {
  const order = new Map<string, number>(
    SENSOR_COLUMN_ORDER.map((type, index) => [type, index]),
  );
  return [...new Set(types)].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999),
  );
}

/**
 * Get a human-readable sensor unit
 */
export function getSensorUnit(type: string): string {
  const units: Record<string, string> = {
    temp: '°C',
    humidity: '%',
    pm1: 'µg/m³',
    pm25: 'µg/m³',
    pm10: 'µg/m³',
    air_quality: '',
    light: 'lux',
    co2: 'ppm',
    gas: 'ppb',
    carbon_monoxide: 'ppm',
    pressure: 'hPa',
    rain: '',
  };
  return units[type] || '';
}

/**
 * Format a sensor reading value with unit
 */
export function formatSensorValue(type: string, value: string): string {
  const unit = getSensorUnit(type);
  return unit ? `${value} ${unit}` : value;
}

/**
 * Get color for sensor status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'ok':
      return 'text-green-500';
    case '418':
      return 'text-yellow-500';
    default:
      return 'text-gray-500';
  }
}
