import tzlookup from '@photostructure/tz-lookup';

import { decodeGeohash } from '@/lib/weatherUtils';
import { computeSolarTimes, type SolarTimes } from '@/lib/solarTimes';
import { formatCountdownTo } from '@/lib/timeUtils';

export function getStationTimezone(lat: number, lng: number): string {
  try {
    return tzlookup(lat, lng) || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatAbsoluteTimeInZone(
  unixSeconds: number,
  timeZone: string,
): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
}

export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
}

export function getTimezoneLabel(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(now);
    const shortName = parts.find((part) => part.type === 'timeZoneName')?.value;
    return shortName ? `${timeZone} (${shortName})` : timeZone;
  } catch {
    return timeZone;
  }
}

export function formatViewerClock(now: Date): string {
  return formatTimeInZone(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function getViewerTimezoneLabel(): string {
  return getTimezoneLabel(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Calendar date at the station, used for sunrise/sunset calculations. */
export function getStationCalendarDate(now: Date, timeZone: string): Date {
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${dateKey}T12:00:00`);
}

export interface SunEventCountdown {
  countdown: string;
  isTomorrow?: boolean;
}

export interface StationTimeInfo {
  timeZone: string;
  timeZoneLabel: string;
  stationClock: string;
  viewerClock: string;
  viewerTimezone: string;
  solar: SolarTimes;
  isDaytime: boolean;
  sunriseCountdown: SunEventCountdown | null;
  sunsetCountdown: SunEventCountdown | null;
}

function buildSunCountdowns(
  now: Date,
  lat: number,
  lng: number,
  timeZone: string,
  solar: SolarTimes,
  calendarDate: Date,
): Pick<StationTimeInfo, 'sunriseCountdown' | 'sunsetCountdown'> {
  if (solar.polarDay || solar.polarNight) {
    return { sunriseCountdown: null, sunsetCountdown: null };
  }

  let sunriseCountdown: SunEventCountdown | null = null;
  let sunsetCountdown: SunEventCountdown | null = null;

  if (solar.sunrise && now < solar.sunrise) {
    const countdown = formatCountdownTo(now, solar.sunrise);
    if (countdown) sunriseCountdown = { countdown };
  } else if (solar.sunset && now < solar.sunset) {
    const countdown = formatCountdownTo(now, solar.sunset);
    if (countdown) sunsetCountdown = { countdown };
  } else {
    const tomorrow = new Date(calendarDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowSolar = computeSolarTimes(tomorrow, lat, lng);
    if (tomorrowSolar.sunrise) {
      const countdown = formatCountdownTo(now, tomorrowSolar.sunrise);
      if (countdown) sunriseCountdown = { countdown, isTomorrow: true };
    }
  }

  return { sunriseCountdown, sunsetCountdown };
}

export function getStationTimeInfo(now: Date, lat: number, lng: number): StationTimeInfo {
  const timeZone = getStationTimezone(lat, lng);
  const calendarDate = getStationCalendarDate(now, timeZone);
  const solar = computeSolarTimes(calendarDate, lat, lng);

  let isDaytime = false;
  if (solar.polarDay) {
    isDaytime = true;
  } else if (solar.polarNight) {
    isDaytime = false;
  } else if (solar.sunrise && solar.sunset) {
    const t = now.getTime();
    isDaytime = t >= solar.sunrise.getTime() && t < solar.sunset.getTime();
  }

  const { sunriseCountdown, sunsetCountdown } = buildSunCountdowns(
    now,
    lat,
    lng,
    timeZone,
    solar,
    calendarDate,
  );

  return {
    timeZone,
    timeZoneLabel: getTimezoneLabel(timeZone, now),
    stationClock: formatTimeInZone(now, timeZone),
    viewerClock: formatViewerClock(now),
    viewerTimezone: getViewerTimezoneLabel(),
    solar,
    isDaytime,
    sunriseCountdown,
    sunsetCountdown,
  };
}

export function formatSunTimeInZone(date: Date | null, timeZone: string): string {
  if (!date) return '—';
  return formatTimeInZone(date, timeZone);
}

export function getStationCoordinates(station: {
  lat?: number;
  lng?: number;
  geohash?: string;
}): { lat: number; lng: number } | null {
  if (station.lat !== undefined && station.lng !== undefined) {
    return { lat: station.lat, lng: station.lng };
  }
  if (station.geohash) {
    return decodeGeohash(station.geohash);
  }
  return null;
}
