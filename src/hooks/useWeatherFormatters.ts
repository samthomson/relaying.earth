import { useCallback } from 'react';

import { useAppContext } from '@/hooks/useAppContext';
import {
  formatSensorValue as formatValue,
  formatDisplayNumber as formatDisplayNum,
  getSensorUnit as getUnit,
  convertSensorNumber,
  type UnitSystem,
} from '@/lib/units';

export function useWeatherFormatters() {
  const { config, updateConfig } = useAppContext();
  const units: UnitSystem = config.units ?? 'metric';

  const setUnits = useCallback(
    (next: UnitSystem) => {
      updateConfig(() => ({ units: next }));
    },
    [updateConfig],
  );

  const formatSensorValue = useCallback(
    (type: string, value: string) => formatValue(type, value, units),
    [units],
  );

  const getSensorUnit = useCallback(
    (type: string) => getUnit(type, units),
    [units],
  );

  const toDisplayNumber = useCallback(
    (type: string, value: string) => convertSensorNumber(type, value, units),
    [units],
  );

  const formatDisplayNumber = useCallback(
    (type: string, displayNumber: number) => formatDisplayNum(type, displayNumber, units),
    [units],
  );

  return {
    units,
    setUnits,
    formatSensorValue,
    formatDisplayNumber,
    getSensorUnit,
    toDisplayNumber,
  };
}
