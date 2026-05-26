/**
 * Normalize an arbitrary user-typed relay address into a canonical
 * `wss://host[/path]` URL string. Falls back gracefully so the caller can
 * decide whether the result is acceptable via {@link isValidRelayUrl}.
 */
export function normalizeRelayUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  // Accept "host", "host/path", or "ws[s]://..." inputs
  if (!/^wss?:\/\//i.test(url)) {
    url = `wss://${url}`;
  }
  try {
    const parsed = new URL(url);
    // Drop hash + trailing slash on bare hosts, keep meaningful pathnames
    parsed.hash = '';
    if (parsed.pathname === '/') parsed.pathname = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Conservative validity check: must parse as a URL with a `ws[s]` scheme and a
 * non-empty host. We don't ping the relay here — that's left to the pool.
 */
export function isValidRelayUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(normalizeRelayUrl(trimmed));
    return (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') && !!parsed.host;
  } catch {
    return false;
  }
}

/**
 * Short, display-friendly relay label (host + optional path).
 */
export function displayRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname && parsed.pathname !== '/'
      ? parsed.host + parsed.pathname
      : parsed.host;
  } catch {
    return url;
  }
}
