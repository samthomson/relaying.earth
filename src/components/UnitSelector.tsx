import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWeatherFormatters } from '@/hooks/useWeatherFormatters';
import type { UnitSystem } from '@/lib/units';
import { cn } from '@/lib/utils';

interface UnitSelectorProps {
  className?: string;
  size?: 'sm' | 'default';
}

const UNIT_OPTIONS: { value: UnitSystem; label: string; short: string }[] = [
  { value: 'metric', label: 'Metric', short: '°C' },
  { value: 'imperial', label: 'US customary', short: '°F' },
];

export function UnitSelector({ className, size = 'sm' }: UnitSelectorProps) {
  const { units, setUnits } = useWeatherFormatters();
  const current = UNIT_OPTIONS.find((o) => o.value === units) ?? UNIT_OPTIONS[0];

  return (
    <Select value={units} onValueChange={(v) => setUnits(v as UnitSystem)}>
      <SelectTrigger
        size={size}
        className={cn('min-w-[5.5rem] font-mono text-xs', className)}
        aria-label="Measurement units"
      >
        <SelectValue>{current.short}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {UNIT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
