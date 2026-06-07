import { getSensorUnit as getMetricSensorUnit } from '@/lib/weatherUtils';

export type UnitSystem = 'metric' | 'imperial';

const IMPERIAL_UNITS: Record<string, string> = {
  temp: '°F',
  pressure: 'inHg',
  rain: 'in',
};

/** Sensors stored in metric on Nostr; only these convert for imperial display. */
const CONVERTIBLE: Record<string, (n: number) => number> = {
  temp: (c) => (c * 9) / 5 + 32,
  pressure: (hpa) => hpa * 0.02953,
  rain: (mm) => mm * 0.0393701,
};

const DISPLAY_DECIMALS: Record<string, number> = {
  temp: 1,
  pressure: 2,
  rain: 2,
};

export function getSensorUnit(type: string, units: UnitSystem): string {
  if (units === 'imperial' && type in IMPERIAL_UNITS) {
    return IMPERIAL_UNITS[type];
  }
  return getMetricSensorUnit(type);
}

export function convertSensorNumber(
  type: string,
  value: string,
  units: UnitSystem,
): number | null {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return null;
  if (units === 'metric') return num;
  const convert = CONVERTIBLE[type];
  return convert ? convert(num) : num;
}

function formatConvertedValue(type: string, num: number): string {
  const decimals = DISPLAY_DECIMALS[type];
  return decimals !== undefined ? num.toFixed(decimals) : String(num);
}

export function formatSensorValue(
  type: string,
  value: string,
  units: UnitSystem,
): string {
  const converted = convertSensorNumber(type, value, units);
  if (converted === null) return value;
  const unit = getSensorUnit(type, units);
  const formatted = formatConvertedValue(type, converted);
  return unit ? `${formatted} ${unit}` : formatted;
}
