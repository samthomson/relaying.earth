import type { SolarTimes } from '@/lib/solarTimes';
import { formatSunTimeInZone, formatTimeInZone } from '@/lib/stationTime';

interface SunDayArcProps {
  now: Date;
  solar: SolarTimes;
  timeZone: string;
  sunriseCountdown?: { countdown: string; isTomorrow?: boolean } | null;
  sunsetCountdown?: { countdown: string; isTomorrow?: boolean } | null;
  showViewerTime: boolean;
  viewerTimeZone: string;
}

const WIDTH = 280;
const HEIGHT = 104;
const PAD = 8;
const BASE_Y = 74;
const ARC_TOP = 16;
/** Night arc dips below the horizon (opposite curvature, shallow). */
const NIGHT_DIP = 14;

function arcPoint(t: number): { x: number; y: number } {
  const x0 = PAD;
  const x2 = WIDTH - PAD;
  const cx = WIDTH / 2;
  const tClamped = Math.max(0, Math.min(1, t));

  const x = (1 - tClamped) ** 2 * x0 + 2 * (1 - tClamped) * tClamped * cx + tClamped ** 2 * x2;
  const y = (1 - tClamped) ** 2 * BASE_Y + 2 * (1 - tClamped) * tClamped * ARC_TOP + tClamped ** 2 * BASE_Y;
  return { x, y };
}

function nightArcPoint(t: number): { x: number; y: number } {
  const x0 = PAD;
  const x2 = WIDTH - PAD;
  const cx = WIDTH / 2;
  const tClamped = Math.max(0, Math.min(1, t));

  const x = (1 - tClamped) ** 2 * x0 + 2 * (1 - tClamped) * tClamped * cx + tClamped ** 2 * x2;
  const y =
    (1 - tClamped) ** 2 * BASE_Y +
    2 * (1 - tClamped) * tClamped * (BASE_Y + NIGHT_DIP) +
    tClamped ** 2 * BASE_Y;
  return { x, y };
}

function getDayProgress(
  now: Date,
  sunrise: Date | null,
  sunset: Date | null,
): number | null {
  if (!sunrise || !sunset) return null;
  const start = sunrise.getTime();
  const end = sunset.getTime();
  if (end <= start) return null;
  return Math.max(0, Math.min(1, (now.getTime() - start) / (end - start)));
}

export function SunDayArc({
  now,
  solar,
  timeZone,
  sunriseCountdown,
  sunsetCountdown,
  showViewerTime,
  viewerTimeZone,
}: SunDayArcProps) {
  if (solar.polarDay || solar.polarNight) {
    return (
      <p className="text-xs text-muted-foreground">
        {solar.polarDay
          ? 'The sun stays up all day at this latitude.'
          : 'The sun does not rise at this latitude today.'}
      </p>
    );
  }

  if (!solar.sunrise || !solar.sunset) return null;

  // The sun travels the day arc above the horizon, or a dim mirrored arc
  // below it at night — never parked at a horizon point.
  const isNight = now < solar.sunrise || now > solar.sunset;
  const dayProgress = getDayProgress(now, solar.sunrise, solar.sunset) ?? 0;
  const nightMs = 24 * 60 * 60 * 1000 - (solar.sunset.getTime() - solar.sunrise.getTime());
  const nightProgress = isNight
    ? now > solar.sunset
      ? Math.min(1, (now.getTime() - solar.sunset.getTime()) / nightMs)
      : Math.max(0, 1 - (solar.sunrise.getTime() - now.getTime()) / nightMs)
    : 0;
  const dayPoint = arcPoint(dayProgress);
  const nightPoint = nightArcPoint(nightProgress);
  const markerX = isNight ? nightPoint.x : dayPoint.x;
  const markerY = isNight ? nightPoint.y : dayPoint.y;

  const arcPath = `M ${PAD} ${BASE_Y} Q ${WIDTH / 2} ${ARC_TOP} ${WIDTH - PAD} ${BASE_Y}`;
  const nightArcPath = `M ${PAD} ${BASE_Y} Q ${WIDTH / 2} ${BASE_Y + NIGHT_DIP} ${WIDTH - PAD} ${BASE_Y}`;

  const nextCountdown = sunsetCountdown ?? sunriseCountdown;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto w-full max-w-[280px]"
        role="img"
        aria-label={`Sun path today. Sunrise ${formatSunTimeInZone(solar.sunrise, timeZone)}, sunset ${formatSunTimeInZone(solar.sunset, timeZone)}, now ${formatTimeInZone(now, timeZone)}`}
      >
        <path
          d={arcPath}
          fill="none"
          stroke="var(--border)"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
        />
        <path
          d={arcPath}
          fill="none"
          stroke="url(#sunArcGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={isNight ? '0 1' : `${dayProgress} 1`}
        />
        <defs>
          <linearGradient id="sunArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(38 80% 55%)" />
            <stop offset="100%" stopColor="hsl(22 96% 54%)" />
          </linearGradient>
        </defs>

        <circle cx={PAD} cy={BASE_Y} r="3" fill="hsl(38 80% 55%)" />
        <circle cx={WIDTH - PAD} cy={BASE_Y} r="3" fill="hsl(22 96% 54%)" />

        <line
          x1={PAD}
          y1={BASE_Y}
          x2={WIDTH - PAD}
          y2={BASE_Y}
          stroke="var(--border)"
          strokeWidth="1"
        />
        {isNight && (
          <path
            d={nightArcPath}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 4"
            opacity="0.5"
            pathLength={1}
          />
        )}

        <line
          x1={markerX}
          y1={BASE_Y}
          x2={markerX}
          y2={markerY}
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity={isNight ? 0.4 : 1}
        />
        <circle
          cx={markerX}
          cy={markerY}
          r="5"
          fill="var(--primary)"
          opacity={isNight ? 0.45 : 1}
        />
        <circle
          cx={markerX}
          cy={markerY}
          r="8"
          fill="var(--primary)"
          opacity={isNight ? 0.1 : 0.2}
        />
      </svg>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div>
          <div className="font-mono uppercase tracking-wide text-muted-foreground">Sunrise</div>
          <div className="mt-0.5 font-medium tabular-nums">
            {formatSunTimeInZone(solar.sunrise, timeZone)}
          </div>
          {showViewerTime && (
            <div className="mt-0.5 text-muted-foreground">
              {formatSunTimeInZone(solar.sunrise, viewerTimeZone)}
            </div>
          )}
        </div>

        <div>
          <div className="font-mono uppercase tracking-wide text-muted-foreground">Next</div>
          {nextCountdown ? (
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              {nextCountdown.isTomorrow ? 'Tomorrow · ' : ''}
              {nextCountdown.countdown}
            </div>
          ) : (
            <div className="mt-0.5 text-muted-foreground">—</div>
          )}
        </div>

        <div>
          <div className="font-mono uppercase tracking-wide text-muted-foreground">Sunset</div>
          <div className="mt-0.5 font-medium tabular-nums">
            {formatSunTimeInZone(solar.sunset, timeZone)}
          </div>
          {showViewerTime && (
            <div className="mt-0.5 text-muted-foreground">
              {formatSunTimeInZone(solar.sunset, viewerTimeZone)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
