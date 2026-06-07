import type { WeatherReading } from '@/lib/weatherUtils';
import { getSensorInterpretation } from '@/lib/sensorInterpretations';
import {
  analyzeBarometricPressure,
  extractPressureSamples,
  PRESSURE_TENDENCY_LABELS,
  type PressureTendency,
} from '@/lib/zambretti';

export interface RainForecast {
  chancePercent: number;
  summary: string;
  /** Ground-truth rain sensor label, when available. */
  currentLabel?: string;
  confidence: 'low' | 'medium' | 'high';
  zambrettiForecast: string;
  pressureTendency: PressureTendency;
  pressureDelta3h: number | null;
  currentPressureHpa: number;
  source: 'barometer';
}

function buildSummary(
  zambretti: { forecast: string; tendency: PressureTendency },
  currentLabel?: string,
): string {
  const tendency = PRESSURE_TENDENCY_LABELS[zambretti.tendency].toLowerCase();
  const base = `Barometer ${tendency} — ${zambretti.forecast.toLowerCase()}.`;
  if (!currentLabel) return base;
  return `${base} Rain sensor reads ${currentLabel.toLowerCase()}.`;
}

/**
 * Short-range rain outlook from the Zambretti barometric forecaster (1915).
 * Uses current pressure and ~3-hour tendency only — rain sensor is shown separately.
 */
export function calculateRainForecast(
  readings: WeatherReading[],
  lat?: number,
): RainForecast | null {
  if (lat === undefined) return null;

  const pressure = analyzeBarometricPressure(extractPressureSamples(readings), lat);
  if (!pressure) return null;

  const latestRain = readings
    .map((reading) => reading.readings.find((entry) => entry.type === 'rain'))
    .find(Boolean);
  const currentLabel = latestRain
    ? getSensorInterpretation('rain', latestRain.value)?.label
    : undefined;

  const confidence: RainForecast['confidence'] =
    pressure.delta3h !== null ? 'high' : 'medium';

  return {
    chancePercent: pressure.rainChance,
    summary: buildSummary(pressure, currentLabel),
    currentLabel,
    confidence,
    zambrettiForecast: pressure.forecast,
    pressureTendency: pressure.tendency,
    pressureDelta3h: pressure.delta3h,
    currentPressureHpa: pressure.currentHpa,
    source: 'barometer',
  };
}
