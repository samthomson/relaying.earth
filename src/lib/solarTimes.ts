const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
/** Standard solar elevation for sunrise/sunset (official sun edge). */
const SUNRISE_SUNSET_ANGLE = RAD * -0.833;

export interface SolarTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  /** Sun stays below horizon all day. */
  polarNight: boolean;
  /** Sun stays above horizon all day. */
  polarDay: boolean;
}

function toJulian(date: Date): number {
  return date.getTime() / DAY_MS - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * DAY_MS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C =
    RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}

function declination(L: number): number {
  return Math.asin(Math.sin(L) * Math.sin(OBLIQUITY));
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - 0.0009 - lw / (2 * Math.PI));
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
}

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos(
    (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)),
  );
}

function getSetJ(
  h: number,
  lw: number,
  phi: number,
  dec: number,
  n: number,
  M: number,
  L: number,
): number | null {
  const w = hourAngle(h, phi, dec);
  if (Number.isNaN(w)) return null;
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

/**
 * Sunrise, sunset, and solar noon for a calendar day at a lat/lng.
 * Based on the SunCalc algorithm (BSD-licensed formulas).
 */
export function computeSolarTimes(date: Date, lat: number, lng: number): SolarTimes {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);
  const Jset = getSetJ(SUNRISE_SUNSET_ANGLE, lw, phi, dec, n, M, L);
  const Jrise = Jset === null ? null : Jnoon - (Jset - Jnoon);

  const polarNight = Jset === null && dec < phi;
  const polarDay = Jset === null && dec > phi;

  return {
    sunrise: Jrise === null ? null : fromJulian(Jrise),
    sunset: Jset === null ? null : fromJulian(Jset),
    solarNoon: fromJulian(Jnoon),
    polarNight,
    polarDay,
  };
}
