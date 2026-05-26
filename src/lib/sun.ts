/**
 * Compute the sub-solar point (where the sun is directly overhead) for a given
 * instant.
 *
 * Returns `{ lat, lng }` in degrees. Accurate to ~0.5° which is more than
 * enough for a stylised day/night terminator — for sub-degree accuracy you'd
 * want a proper ephemeris library (e.g. `suncalc`).
 *
 * Algorithm:
 *  - lat ≈ solar declination ≈ 23.44° * sin(2π * (dayOfYear - 80) / 365.25)
 *  - lng = 180° - UTC_seconds_since_midnight * (360° / 86400)
 *    (At 00:00 UTC the sun is at lng=180 / antimeridian; at 12:00 UTC it's at
 *    Greenwich.)
 */
export function computeSubSolarPoint(date: Date): { lat: number; lng: number } {
  const utcMs = date.getTime();
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (utcMs - yearStart) / 86_400_000;

  const declinationDeg =
    23.44 * Math.sin(((2 * Math.PI) / 365.25) * (dayOfYear - 80));

  const secondsUtc =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds();
  let lng = 180 - (secondsUtc * 360) / 86_400;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;

  return { lat: declinationDeg, lng };
}
