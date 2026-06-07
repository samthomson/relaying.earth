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

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'metric', label: 'Metric units' },
  { value: 'imperial', label: 'American units' },
];

export function UnitSelector({ className, size = 'sm' }: UnitSelectorProps) {
  const { units, setUnits } = useWeatherFormatters();
  const current = UNIT_OPTIONS.find((o) => o.value === units) ?? UNIT_OPTIONS[0];

  return (
    <Select value={units} onValueChange={(v) => setUnits(v as UnitSystem)}>
      <SelectTrigger
        size={size}
        className={cn('min-w-[9.5rem] text-xs', className)}
        aria-label="Measurement units"
      >
        <SelectValue>{current.label}</SelectValue>
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
