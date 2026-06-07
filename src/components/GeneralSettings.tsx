import { Label } from '@/components/ui/label';
import { UnitSelector } from '@/components/UnitSelector';

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="unit-system">Measurement units</Label>
        <p className="text-sm text-muted-foreground">
          Weather readings are stored in metric on Nostr. Choose how values are
          displayed across the site.
        </p>
        <UnitSelector size="default" className="w-full max-w-xs" />
      </div>
    </div>
  );
}
