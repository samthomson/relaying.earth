import { Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  getSensorIndicatorClass,
  SENSOR_INTERPRETATION_GUIDE,
} from '@/lib/sensorInterpretations';
import { cn } from '@/lib/utils';

interface SensorInterpretationGuideProps {
  className?: string;
}

export function SensorInterpretationGuide({ className }: SensorInterpretationGuideProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground', className)}
          aria-label="How sensor labels are determined"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reading labels</DialogTitle>
          <DialogDescription>
            Some sensors show a plain-language label alongside the raw value. Bands
            below are applied automatically from each reading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {SENSOR_INTERPRETATION_GUIDE.map((section) => (
            <section key={section.title}>
              <h3 className="font-display text-sm font-semibold text-foreground">
                {section.title}
                {section.unit && (
                  <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                    ({section.unit})
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p>
              <ul className="mt-3 space-y-2">
                {section.tiers.map((tier) => (
                  <li
                    key={`${section.title}-${tier.label}`}
                    className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
                  >
                    {tier.indicator ? (
                      <span
                        className={cn(
                          'mt-1 h-2 w-2 shrink-0 rounded-full',
                          getSensorIndicatorClass(tier.indicator),
                        )}
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{tier.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">{tier.range}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
