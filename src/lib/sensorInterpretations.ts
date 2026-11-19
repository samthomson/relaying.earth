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
  /** Sensor types this section explains (per-value info button lookup). */
  types?: string[];
  /** Specific hardware model — soil probes explain each model separately. */
  model?: string;
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

/**
 * Sensirion VOC/NOx Index (SGP41): 1–500 relative scale where 100 is the
 * recent daily average — values below 100 are cleaner than average.
 */
export const SGP41_INDEX_TIERS: PmTierDefinition[] = [
  { level: 'excellent', label: 'Excellent', maxExclusive: 50 },
  { level: 'great', label: 'Great', maxExclusive: 100 },
  { level: 'good', label: 'Good', maxExclusive: 150 },
  { level: 'moderate', label: 'Moderate', maxExclusive: 250 },
  { level: 'unhealthy', label: 'Unhealthy', maxExclusive: 350 },
];

/** CO₂ in ppm (SCD41 et al.): ~420 ppm is outdoor ambient. */
export const CO2_TIERS: PmTierDefinition[] = [
  { level: 'excellent', label: 'Fresh air', maxExclusive: 450 },
  { level: 'great', label: 'Great', maxExclusive: 800 },
  { level: 'good', label: 'Good', maxExclusive: 1200 },
  { level: 'moderate', label: 'Stale', maxExclusive: 2000 },
  { level: 'unhealthy', label: 'Unhealthy', maxExclusive: 3000 },
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

function formatIndexGuideTiers(tiers: PmTierDefinition[], unit?: string) {
  const rows = tiers.map((tier, index) => {
    const min = index === 0 ? 0 : tiers[index - 1].maxExclusive;
    const suffix = unit ? ` ${unit}` : '';
    return {
      label: tier.label,
      range: `${min}–${tier.maxExclusive}${suffix}`,
      indicator: { kind: 'air' as const, level: tier.level },
    };
  });
  const suffix = unit ? ` ${unit}` : '';
  rows.push({
    label: 'Hazardous',
    range: `${tiers[tiers.length - 1].maxExclusive}+${suffix}`,
    indicator: { kind: 'air', level: 'hazardous' },
  });
  return rows;
}

export const SENSOR_INTERPRETATION_GUIDE: InterpretationGuideSection[] = [
  {
    types: ['light'],
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
    types: ['rain'],
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
    types: ['pm1', 'pm25', 'pm10'],
    title: 'PM1.0 & PM2.5',
    unit: 'µg/m³',
    intro:
      'Particulate matter concentrations in micrograms per cubic metre. Labels use six bands with finer resolution at low readings.',
    tiers: formatPmGuideTiers(PM_FINE_TIERS),
  },
  {
    types: ['co2'],
    title: 'CO₂',
    unit: 'ppm',
    intro:
      'True CO₂ concentration (e.g. SCD41). Outdoor air sits near 420 ppm; levels above ~1000 ppm usually mean poor ventilation.',
    tiers: formatIndexGuideTiers(CO2_TIERS, 'ppm'),
  },
  {
    types: ['voc_index'],
    title: 'VOC index',
    intro:
      'Sensirion VOC Index (SGP41): a relative 1–500 score where 100 is the recent daily average. Lower is cleaner; it measures organic gas load, not a fixed concentration.',
    tiers: formatIndexGuideTiers(SGP41_INDEX_TIERS),
  },
  {
    types: ['nox_index'],
    title: 'NOx index',
    intro:
      'Sensirion NOx Index (SGP41): the same 1–500 relative scale for nitrogen oxides. Outdoor NOx often reads very low (1–20).',
    tiers: formatIndexGuideTiers(SGP41_INDEX_TIERS),
  },
  {
    types: ['soil_moisture'],
    model: 'CAPACITIVE-V1.2',
    title: 'Soil · CAPACITIVE-V1.2 (module)',
    unit: 'raw 0–4095',
    intro:
      'Capacitive TLC555 module ("Corrosion Resistant v1.2"). Higher = drier. Its analog output tops out at 3.0 V ≈ 3720 raw, so it never reaches full scale — dry air typically reads 2300–3100. Moisture % is measured against that 3720 ceiling.',
    tiers: [
      { label: 'Saturated', range: '0–799' },
      { label: 'Wet', range: '800–1799' },
      { label: 'Moist', range: '1800–2799' },
      { label: 'Dry', range: '2800–3719' },
      { label: 'Very dry (module max)', range: '3720+' },
    ],
  },
  {
    types: ['soil_moisture'],
    model: 'SOIL-METAL-1M',
    title: 'Soil · SOIL-METAL-1M (module)',
    unit: 'raw 0–4095',
    intro:
      'Metal-fork resistive module on a 1.3 m cable (LM393-style). Higher = drier across the full scale: ≈4095 means bone dry or the fork disconnected/not in soil; ≈0–200 is standing water. Moisture % is measured against 4095.',
    tiers: [
      { label: 'Saturated', range: '0–799' },
      { label: 'Wet', range: '800–1799' },
      { label: 'Moist', range: '1800–2799' },
      { label: 'Dry', range: '2800–3799' },
      { label: 'Very dry / disconnected', range: '3800–4095' },
    ],
  },
  {
    types: ['soil_moisture'],
    model: 'HW-080',
    title: 'Soil · HW-080 (bare probe + 10 kΩ divider)',
    unit: 'raw 0–4095',
    intro:
      'A bare two-wire resistive fork — no electronics — read through a resistor divider, so its direction is inverted: higher = wetter. Dry air sits near 0; the very top means saturated or shorted prongs. The station energises it only ~5 ms per reading (switched excitation) so it cannot bias sibling probes sharing the pot. Moisture % is raw ÷ 4095.',
    tiers: [
      { label: 'Very dry (air)', range: '0–299' },
      { label: 'Dry', range: '300–1499' },
      { label: 'Moist', range: '1500–2999' },
      { label: 'Wet', range: '3000–3799' },
      { label: 'Saturated / shorted', range: '3800–4095' },
    ],
  },
];

/**
 * Soil moisture is an uncalibrated raw ADC score (0–4095). Which end means
 * "wet" depends on the probe family: integrated modules (capacitive boards,
 * LM393 resistive modules) read higher = drier, while a bare two-wire probe
 * read through a resistor divider reads higher = wetter.
 */
export type SoilProbeFamily = 'module' | 'divider';

const SOIL_DIVIDER_MODEL = /hw-?080|divider|bare/i;
const SOIL_MODULE_MODEL = /capacitive|metal|lm393|module/i;

/** Best-effort probe family from the reading's model tag, if recognisable. */
export function soilProbeFamily(model?: string): SoilProbeFamily | null {
  if (!model) return null;
  if (SOIL_DIVIDER_MODEL.test(model)) return 'divider';
  if (SOIL_MODULE_MODEL.test(model)) return 'module';
  return null;
}

interface SoilTier {
  label: string;
  /** Upper bound (exclusive). */
  maxExclusive: number;
}

/** Integrated modules (higher = drier). Bands are indicative, not calibrated. */
const SOIL_MODULE_TIERS: SoilTier[] = [
  { label: 'Saturated', maxExclusive: 800 },
  { label: 'Wet', maxExclusive: 1800 },
  { label: 'Moist', maxExclusive: 2800 },
  { label: 'Dry', maxExclusive: 3700 },
  { label: 'Very dry (module max)', maxExclusive: 4096 },
];

/** Bare probe through a divider (higher = wetter). */
const SOIL_DIVIDER_TIERS: SoilTier[] = [
  { label: 'Very dry (air)', maxExclusive: 300 },
  { label: 'Dry', maxExclusive: 1500 },
  { label: 'Moist', maxExclusive: 3000 },
  { label: 'Wet', maxExclusive: 3800 },
  { label: 'Saturated', maxExclusive: 4096 },
];

/** The capacitive module's analog out tops out at 3.0 V ≈ 3720 raw. */
const SOIL_CAPACITIVE_MAX_RAW = 3720;

/**
 * Relative moisture as a percentage of the probe's raw scale (uncalibrated —
 * a rough wetness indicator, not a calibrated volumetric %). Null when the
 * model is unrecognised.
 */
export function getSoilMoisturePercent(value: number, model?: string): number | null {
  const family = soilProbeFamily(model);
  if (!family || !model) return null;
  const maxRaw = /capacitive/i.test(model) ? SOIL_CAPACITIVE_MAX_RAW : 4095;
  const fraction = family === 'divider' ? value / 4095 : (maxRaw - value) / maxRaw;
  return Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}

function interpretSoil(value: number, model?: string): SensorInterpretation {
  const family = soilProbeFamily(model);
  const tiers =
    family === 'divider' ? SOIL_DIVIDER_TIERS
    : family === 'module' ? SOIL_MODULE_TIERS
    : null;
  const percent = getSoilMoisturePercent(value, model);
  if (!tiers) {
    return {
      label: percent !== null ? `≈${percent}% wet` : value < 1400 ? 'Low raw' : value < 2800 ? 'Mid raw' : 'High raw',
      detail: `Uncalibrated raw score (0–4095); which end means wet depends on the probe model.`,
    };
  }
  const tier = tiers.find((entry) => value < entry.maxExclusive) ?? tiers.at(-1)!;
  return {
    label: `${tier.label} · ≈${percent}% wet`,
    detail: family === 'divider'
      ? 'Raw 0–4095, higher = wetter (bare probe + divider). % is relative to the raw scale — indicative until calibrated for the soil.'
      : 'Raw 0–4095, higher = drier (integrated module). % is relative to the raw scale — indicative until calibrated for the soil.',
  };
}

/** Guide section for a sensor value, most specific match first (model > family > type). */
export function getSensorGuideSection(
  type: string,
  model?: string,
): InterpretationGuideSection | null {
  const sections = SENSOR_INTERPRETATION_GUIDE.filter((s) => s.types?.includes(type));
  if (sections.length === 0) return null;
  if (model) {
    const exact = sections.find((s) => s.model === model);
    if (exact) return exact;
    if (soilProbeFamily(model) === 'divider') {
      return sections.find((s) => s.model === 'HW-080') ?? sections[0];
    }
  }
  return sections[0];
}

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

function classifyTiers(tiers: PmTierDefinition[], value: number): SensorInterpretation {
  const tier = tiers.find((entry) => value < entry.maxExclusive);
  return {
    label: tier?.label ?? 'Hazardous',
    indicator: { kind: 'air', level: tier?.level ?? 'hazardous' },
  };
}

const INTERPRETABLE_SENSORS = new Set([
  'light',
  'rain',
  'pm1',
  'pm25',
  'co2',
  'soil_moisture',
]);

export const RAIN_CHART_LABELS = ['Dry', 'Damp', 'Wet', 'Raining', 'Heavy'] as const;

/** Map raw MH-RD reading (0–4095, higher = drier) to chart level 0–4 (dry → heavy). */
export function rainRawToLevel(raw: number): number {
  const tier =
    RAIN_TIERS.find((entry) => raw >= entry.minInclusive) ?? RAIN_TIERS.at(-1)!;
  const order: Record<RainLevel, number> = {
    dry: 0,
    damp: 1,
    wet: 2,
    raining: 3,
    heavy: 4,
  };
  return order[tier.level];
}

export function formatRainChartTick(level: number): string {
  const idx = Math.max(0, Math.min(RAIN_CHART_LABELS.length - 1, Math.round(level)));
  return RAIN_CHART_LABELS[idx];
}

export function hasSensorInterpretation(type: string): boolean {
  return INTERPRETABLE_SENSORS.has(type);
}

export function getSensorInterpretation(
  type: string,
  value: string,
  model?: string,
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
    case 'voc_index':
    case 'nox_index':
      return classifyTiers(SGP41_INDEX_TIERS, numeric);
    case 'co2':
      return classifyTiers(CO2_TIERS, numeric);
    case 'soil_moisture':
      return interpretSoil(numeric, model);
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

/**
 * Text-safe counterparts to `getSensorIndicatorClass` — AA contrast on the
 * paper-white canvas, same hue semantics as the indicator dots.
 */
export function getSensorTextClass(indicator: SensorIndicator): string {
  switch (indicator.kind) {
    case 'light':
      return indicator.level === 'dark' ? 'text-stone-700' : 'text-amber-700';
    case 'rain':
      switch (indicator.level) {
        case 'dry':
          return 'text-amber-700';
        case 'damp':
          return 'text-stone-600';
        case 'wet':
          return 'text-sky-700';
        case 'raining':
          return 'text-blue-700';
        case 'heavy':
          return 'text-blue-900';
      }
      break;
    case 'air':
      switch (indicator.level) {
        case 'excellent':
        case 'great':
          return 'text-emerald-700';
        case 'good':
          return 'text-lime-700';
        case 'moderate':
          return 'text-amber-700';
        case 'unhealthy':
          return 'text-orange-700';
        case 'hazardous':
          return 'text-red-700';
      }
  }
}
