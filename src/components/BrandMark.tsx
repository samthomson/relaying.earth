import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  /** Disable the gentle pulsing animation on the outer signal arc. */
  static?: boolean;
}

/**
 * The relaying.earth mark — a transmitting planet. Dark globe grid, maroon
 * broadcast arcs and station node. Orange and purple are reserved for CTAs
 * and rare accents elsewhere in the app.
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
      {/* Globe */}
      <circle cx="18" cy="22" r="12" className="stroke-foreground" strokeWidth="1.7" />
      {/* Meridian (longitude) */}
      <ellipse
        cx="18"
        cy="22"
        rx="4.6"
        ry="12"
        className="stroke-muted-foreground"
        strokeWidth="1.2"
        opacity="0.55"
      />
      {/* Equator (latitude) */}
      <ellipse
        cx="18"
        cy="22"
        rx="12"
        ry="4.6"
        className="stroke-muted-foreground"
        strokeWidth="1.2"
        opacity="0.55"
      />
      {/* Broadcast arcs */}
      <g className="stroke-brand-maroon" strokeWidth="1.7" strokeLinecap="round" fill="none">
        <path d="M25.95 9.03 A4.5 4.5 0 0 1 30.97 14.05" opacity="0.85" />
        <path
          d="M25.52 5.56 A8 8 0 0 1 34.44 14.48"
          opacity="0.45"
          className={isStatic ? undefined : 'motion-safe:animate-pulse'}
        />
      </g>
      {/* Station node */}
      <circle cx="26.5" cy="13.5" r="1.9" className="fill-brand-maroon" />
    </svg>
  );
}
