import { ReactNode, useEffect, useRef } from 'react';
import { init } from '@plausible-analytics/tracker';

interface PlausibleProviderProps {
  children: ReactNode;
}

/**
 * Initializes Plausible Analytics in production only.
 * Plausible's `init()` can only be called once, so we guard with a ref.
 */
export function PlausibleProvider({ children }: PlausibleProviderProps) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !import.meta.env.PROD) return;
    initializedRef.current = true;

    init({
      domain: 'relaying.earth',
      captureOnLocalhost: false,
    });
  }, []);

  return <>{children}</>;
}
