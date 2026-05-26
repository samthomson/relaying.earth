/**
 * Format a unix timestamp (in seconds) as a short relative time string.
 *
 * Designed for weather data — most timestamps will be recent, so we cap at days
 * and fall back to absolute date for older events.
 */
export function formatRelativeTime(unixSeconds: number, now = Date.now()): string {
  const deltaSec = Math.floor(now / 1000 - unixSeconds);
  if (deltaSec < 5) return 'just now';
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  // Older than a week — show a short absolute date
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: days > 365 ? 'numeric' : undefined,
  });
}

/**
 * Returns a precise but compact absolute timestamp, useful for tooltips.
 */
export function formatAbsoluteTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
