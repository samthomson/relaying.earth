import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  /** Disable the gentle pulsing animation. */
  static?: boolean;
}

/**
 * The relaying.earth mark — a stylised globe being relayed: a circle (the
 * planet) with three rising transmission lines escaping it.
 *
 * Uses `currentColor` so it adapts to text colour. Best used at 32–96px.
 */
export function BrandMark({ className, static: isStatic = false }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-hidden="true"
      className={cn('overflow-visible', className)}
    >
      {/* Planet */}
      <circle
        cx="20"
        cy="24"
        r="11"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.85"
      />
      {/* Equator */}
      <ellipse
        cx="20"
        cy="24"
        rx="11"
        ry="3.4"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.32"
      />
      {/* Transmission rays */}
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={isStatic ? undefined : 'origin-center'}
      >
        <line x1="20" y1="9.5" x2="20" y2="3" opacity="0.95" />
        <line x1="11.5" y1="13" x2="6.5" y2="8" opacity="0.6" />
        <line x1="28.5" y1="13" x2="33.5" y2="8" opacity="0.6" />
      </g>
      {/* Centre dot — the transmitting station */}
      <circle cx="20" cy="13" r="1.8" fill="currentColor" />
    </svg>
  );
}
