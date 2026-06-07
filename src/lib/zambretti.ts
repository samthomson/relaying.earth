/** Barometric tendency over ~3 hours (classic short-range forecasting input). */
export type PressureTendency =
  | 'rising_fast'
  | 'rising_slow'
  | 'steady'
  | 'falling_slow'
  | 'falling_fast';

/** Tendency index used by the Zambretti formula (1 = rising fast … 5 = falling fast). */
const TENDENCY_TO_ZAMBRETTI: Record<PressureTendency, number> = {
  rising_fast: 1,
  rising_slow: 2,
  steady: 3,
  falling_slow: 4,
  falling_fast: 5,
};

export const PRESSURE_TENDENCY_LABELS: Record<PressureTendency, string> = {
  rising_fast: 'Rising fast',
  rising_slow: 'Rising slowly',
  steady: 'Steady',
  falling_slow: 'Falling slowly',
  falling_fast: 'Falling fast',
};

/** Standard Zambretti forecast phrases (index 0–25). */
export const ZAMBRETTI_FORECASTS = [
  'Settled fine',
  'Fine weather',
  'Becoming fine',
  'Fine, becoming less settled',
  'Fine, possible showers',
  'Fairly fine, showers likely',
  'Fairly fine, occasional rain',
  'Rather unsettled, showers',
  'Unsettled, showers',
  'Unsettled, rain at times',
  'Very unsettled, rain',
  'Very unsettled, rain at times',
  'Stormy, may improve',
  'Stormy, rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
  'Very stormy, much rain',
] as const;

/** Rain likelihood implied by each Zambretti index. */
const ZAMBRETTI_RAIN_CHANCE = [
  5, 8, 10, 14, 20, 28, 36, 44, 52, 60, 70, 76, 80, 86, 90, 92, 93, 94, 95, 95, 96, 96,
  97, 97, 98, 98,
];

export interface PressureSample {
  timestamp: number;
  hpa: number;
}

export interface ZambrettiResult {
  currentHpa: number;
  /** Pressure change normalised to a 3-hour window (hPa). */
  delta3h: number | null;
  tendency: PressureTendency;
  forecastIndex: number;
  forecast: string;
  rainChance: number;
}

/**
 * Classify barometric tendency from a normalised 3-hour pressure change (hPa).
 * Thresholds follow the classic "pressure tendency" rules used with barometers.
 */
export function classifyPressureTendency(delta3h: number): PressureTendency {
  if (delta3h >= 1.5) return 'rising_fast';
  if (delta3h >= 0.1) return 'rising_slow';
  if (delta3h > -0.1) return 'steady';
  if (delta3h > -1.5) return 'falling_slow';
  return 'falling_fast';
}

function isNorthernHemisphereSummer(date: Date, lat: number): boolean {
  const month = date.getUTCMonth() + 1;
  const northernSummer = month >= 4 && month <= 9;
  return lat >= 0 ? northernSummer : !northernSummer;
}

/**
 * Zambretti forecaster — a classic barometric algorithm (1915) used on home weather
 * stations. Inputs: sea-level pressure (hPa), 3-hour tendency, latitude, date.
 */
export function calculateZambretti(
  pressureHpa: number,
  tendency: PressureTendency,
  lat: number,
  date = new Date(),
): Pick<ZambrettiResult, 'forecastIndex' | 'forecast' | 'rainChance'> {
  const t = TENDENCY_TO_ZAMBRETTI[tendency];
  const pRound = Math.round(pressureHpa / 10);
  const summer = isNorthernHemisphereSummer(date, lat);

  let index: number;
  if (lat >= 0) {
    index = (summer ? 23 : 28) - t * 2 - (pRound - 10) * 2;
  } else {
    index = (summer ? 21 : 26) - t * 2 - (pRound - 10) * 2;
  }

  index = Math.max(0, Math.min(25, index));
  return {
    forecastIndex: index,
    forecast: ZAMBRETTI_FORECASTS[index],
    rainChance: ZAMBRETTI_RAIN_CHANCE[index] ?? 50,
  };
}

/**
 * Derive pressure tendency from timed readings. Normalises the delta to a 3-hour
 * equivalent when the sample window differs.
 */
export function analyzeBarometricPressure(
  samples: PressureSample[],
  lat: number,
  date = new Date(),
): ZambrettiResult | null {
  if (samples.length === 0) return null;

  const sorted = [...samples].sort((a, b) => b.timestamp - a.timestamp);
  const current = sorted[0];
  const targetTs = current.timestamp - 3 * 3600;

  let reference = sorted.find(
    (sample) =>
      sample.timestamp <= targetTs + 45 * 60 &&
      sample.timestamp >= targetTs - 45 * 60,
  );
  if (!reference && sorted.length > 1) {
    reference = sorted[sorted.length - 1];
  }

  let delta3h: number | null = null;
  let tendency: PressureTendency = 'steady';

  if (reference && reference.timestamp !== current.timestamp) {
    const hours = (current.timestamp - reference.timestamp) / 3600;
    if (hours >= 0.5) {
      delta3h = (current.hpa - reference.hpa) * (3 / hours);
      tendency = classifyPressureTendency(delta3h);
    }
  }

  const zambretti = calculateZambretti(current.hpa, tendency, lat, date);

  return {
    currentHpa: current.hpa,
    delta3h,
    tendency,
    ...zambretti,
  };
}

export function extractPressureSamples(
  readings: Array<{
    timestamp: number;
    readings: Array<{ type: string; value: string }>;
  }>,
): PressureSample[] {
  return readings
    .map((reading) => {
      const point = reading.readings.find((entry) => entry.type === 'pressure');
      if (!point) return null;
      const hpa = Number.parseFloat(point.value);
      if (!Number.isFinite(hpa)) return null;
      return { timestamp: reading.timestamp, hpa };
    })
    .filter((sample): sample is PressureSample => sample !== null);
}
