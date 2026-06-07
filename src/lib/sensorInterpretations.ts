/** Six-tier air quality bands used for PM readings (µg/m³). */
export type AirQualityLevel =
  | 'excellent'
  | 'great'
  | 'good'
  | 'moderate'
  | 'unhealthy'
  | 'hazardous';

export type LightLevel = 'dark' | 'light';

export type RainLevel = 'dry' | 'damp' | 'wet' | 'raining' | 'heavy';

export type SensorIndicator =
  | { kind: 'air'; level: AirQualityLevel }
  | { kind: 'light'; level: LightLevel }
  | { kind: 'rain'; level: RainLevel };

export interface SensorInterpretation {
  /** Short human-readable label, e.g. "Dry" or "Excellent". */
  label: string;
  /** Optional longer hint shown in compact layouts. */
  detail?: string;
  indicator?: SensorIndicator;
}

export interface PmTierDefinition {
  level: AirQualityLevel;
  label: string;
  /** Upper bound (exclusive) for this tier — value must be below this to match. */
  maxExclusive: number;
}

export interface InterpretationGuideSection {
  title: string;
  unit?: string;
  intro: string;
  tiers: Array<{
    label: string;
    range: string;
    indicator?: SensorIndicator;
  }>;
}

/** PM2.5 / PM1 thresholds — finer bands at low concentrations. */
export const PM_FINE_TIERS: PmTierDefinition[] = [
  { level: 'excellent', label: 'Excellent', maxExclusive: 4 },
  { level: 'great', label: 'Great', maxExclusive: 8 },
  { level: 'good', label: 'Good', maxExclusive: 12 },
  { level: 'moderate', label: 'Moderate', maxExclusive: 35 },
  { level: 'unhealthy', label: 'Unhealthy', maxExclusive: 55 },
];

/** PM10 uses the same low-end bands, scaled for larger particles. */
export const PM10_TIERS: PmTierDefinition[] = [
  { level: 'excellent', label: 'Excellent', maxExclusive: 8 },
  { level: 'great', label: 'Great', maxExclusive: 16 },
  { level: 'good', label: 'Good', maxExclusive: 24 },
  { level: 'moderate', label: 'Moderate', maxExclusive: 154 },
  { level: 'unhealthy', label: 'Unhealthy', maxExclusive: 254 },
];

/** MH-RD rain sensor: higher raw value = drier (typically 0–4095). */
export const RAIN_DRY_MAX = 4095;

const RAIN_TIERS: Array<{ label: string; minInclusive: number; level: RainLevel }> = [
  { label: 'Dry', minInclusive: 3200, level: 'dry' },
  { label: 'Damp', minInclusive: 2000, level: 'damp' },
  { label: 'Wet', minInclusive: 800, level: 'wet' },
  { label: 'Raining', minInclusive: 200, level: 'raining' },
  { label: 'Heavy rain', minInclusive: 0, level: 'heavy' },
];

function formatPmRange(tiers: PmTierDefinition[], index: number): string {
  const tier = tiers[index];
  const min = index === 0 ? 0 : tiers[index - 1].maxExclusive;
  return `${min}–${tier.maxExclusive} µg/m³`;
}

function formatPmGuideTiers(tiers: PmTierDefinition[]) {
  const rows = tiers.map((tier, index) => ({
    label: tier.label,
    range: formatPmRange(tiers, index),
    indicator: { kind: 'air' as const, level: tier.level },
  }));
  const lastMax = tiers[tiers.length - 1].maxExclusive;
  rows.push({
    label: 'Hazardous',
    range: `${lastMax}+ µg/m³`,
    indicator: { kind: 'air', level: 'hazardous' },
  });
  return rows;
}

export const SENSOR_INTERPRETATION_GUIDE: InterpretationGuideSection[] = [
  {
    title: 'Light',
    unit: 'lux',
    intro:
      'BH1750 light sensors report in lux. Placement varies widely — a shaded station can read single-digit lux in daytime, so any value above zero is treated as lit.',
    tiers: [
      { label: 'Dark', range: '0 lux', indicator: { kind: 'light', level: 'dark' } },
      { label: 'Light', range: 'Above 0 lux', indicator: { kind: 'light', level: 'light' } },
    ],
  },
  {
    title: 'Rain',
    intro:
      'MH-RD rain sensors report a raw score from the analog output (typically 0–4095). Higher values mean drier conditions.',
    tiers: RAIN_TIERS.map((tier, index) => {
      const nextMin = RAIN_TIERS[index - 1]?.minInclusive;
      const range =
        nextMin !== undefined
          ? `${tier.minInclusive}–${nextMin - 1}`
          : `${tier.minInclusive}+`;
      return { label: tier.label, range, indicator: { kind: 'rain', level: tier.level } };
    }),
  },
  {
    title: 'PM1.0 & PM2.5',
    unit: 'µg/m³',
    intro:
      'Particulate matter concentrations in micrograms per cubic metre. Labels use six bands with finer resolution at low readings.',
    tiers: formatPmGuideTiers(PM_FINE_TIERS),
  },
  {
    title: 'PM10',
    unit: 'µg/m³',
    intro:
      'Larger particulate matter uses the same band names with thresholds scaled for typical PM10 readings.',
    tiers: formatPmGuideTiers(PM10_TIERS),
  },
];

function parseNumericValue(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyPm(type: string, value: number): SensorInterpretation {
  const tiers = type === 'pm10' ? PM10_TIERS : PM_FINE_TIERS;

  for (const tier of tiers) {
    if (value < tier.maxExclusive) {
      return {
        label: tier.label,
        indicator: { kind: 'air', level: tier.level },
      };
    }
  }

  return {
    label: 'Hazardous',
    indicator: { kind: 'air', level: 'hazardous' },
  };
}

function interpretLight(value: number): SensorInterpretation {
  if (value <= 0) {
    return { label: 'Dark', indicator: { kind: 'light', level: 'dark' } };
  }
  return { label: 'Light', indicator: { kind: 'light', level: 'light' } };
}

function interpretRain(value: number): SensorInterpretation {
  const dryPercent = Math.round((value / RAIN_DRY_MAX) * 100);
  const tier =
    RAIN_TIERS.find((entry) => value >= entry.minInclusive) ?? RAIN_TIERS.at(-1)!;

  return {
    label: tier.label,
    detail: `${dryPercent}% dry reading`,
    indicator: { kind: 'rain', level: tier.level },
  };
}

const INTERPRETABLE_SENSORS = new Set(['light', 'rain', 'pm1', 'pm25', 'pm10']);

export function hasSensorInterpretation(type: string): boolean {
  return INTERPRETABLE_SENSORS.has(type);
}

export function getSensorInterpretation(
  type: string,
  value: string,
): SensorInterpretation | null {
  if (!INTERPRETABLE_SENSORS.has(type)) return null;

  const numeric = parseNumericValue(value);
  if (numeric === null) return null;

  switch (type) {
    case 'light':
      return interpretLight(numeric);
    case 'rain':
      return interpretRain(numeric);
    case 'pm1':
    case 'pm25':
    case 'pm10':
      return classifyPm(type, numeric);
    default:
      return null;
  }
}

export function getSensorIndicatorClass(indicator: SensorIndicator): string {
  switch (indicator.kind) {
    case 'light':
      return indicator.level === 'dark' ? 'bg-stone-700' : 'bg-amber-300';
    case 'rain':
      switch (indicator.level) {
        case 'dry':
          return 'bg-amber-200';
        case 'damp':
          return 'bg-stone-400';
        case 'wet':
          return 'bg-sky-400';
        case 'raining':
          return 'bg-blue-600';
        case 'heavy':
          return 'bg-blue-900';
      }
      break;
    case 'air':
      switch (indicator.level) {
        case 'excellent':
          return 'bg-emerald-600';
        case 'great':
          return 'bg-emerald-500';
        case 'good':
          return 'bg-lime-500';
        case 'moderate':
          return 'bg-amber-400';
        case 'unhealthy':
          return 'bg-orange-500';
        case 'hazardous':
          return 'bg-red-600';
      }
  }
}
