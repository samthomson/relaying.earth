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
const HEIGHT = 100;
const PAD = 8;
const BASE_Y = 78;
const ARC_TOP = 18;

function arcPoint(t: number): { x: number; y: number } {
  const x0 = PAD;
  const x2 = WIDTH - PAD;
  const cx = WIDTH / 2;
  const tClamped = Math.max(0, Math.min(1, t));

  const x = (1 - tClamped) ** 2 * x0 + 2 * (1 - tClamped) * tClamped * cx + tClamped ** 2 * x2;
  const y = (1 - tClamped) ** 2 * BASE_Y + 2 * (1 - tClamped) * tClamped * ARC_TOP + tClamped ** 2 * BASE_Y;
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

  const dayProgress = getDayProgress(now, solar.sunrise, solar.sunset) ?? 0;
  const sunPoint = arcPoint(dayProgress);
  const markerX = sunPoint.x;
  const markerY = sunPoint.y;

  const arcPath = `M ${PAD} ${BASE_Y} Q ${WIDTH / 2} ${ARC_TOP} ${WIDTH - PAD} ${BASE_Y}`;

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
          strokeDasharray={`${dayProgress} 1`}
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
          x1={markerX}
          y1={BASE_Y + 6}
          x2={markerX}
          y2={markerY}
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />
        <circle cx={markerX} cy={markerY} r="5" fill="var(--primary)" />
        <circle cx={markerX} cy={markerY} r="8" fill="var(--primary)" opacity="0.2" />
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
          <div className="font-mono uppercase tracking-wide text-muted-foreground">Now</div>
          <div className="mt-0.5 font-medium tabular-nums text-primary">
            {formatTimeInZone(now, timeZone)}
          </div>
          {nextCountdown && (
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              {nextCountdown.isTomorrow ? 'Tomorrow · ' : ''}
              {nextCountdown.countdown}
            </div>
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
