import { Label } from '@/components/ui/label';
import { UnitSelector } from '@/components/UnitSelector';

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="unit-system">Units</Label>
        <UnitSelector size="default" className="w-full max-w-xs" />
      </div>
    </div>
  );
}
