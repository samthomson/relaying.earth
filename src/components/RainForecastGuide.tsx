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
import { cn } from '@/lib/utils';

interface RainForecastGuideProps {
  className?: string;
}

export function RainForecastGuide({ className }: RainForecastGuideProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground', className)}
          aria-label="How the rain outlook is calculated"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rain outlook</DialogTitle>
          <DialogDescription>
            A short-range estimate from this station&apos;s barometer using the classic
            Zambretti forecaster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            The percentage comes from the <strong className="text-foreground">Zambretti
            forecaster</strong> (1915): current pressure plus the change over roughly the
            last 3 hours (rising, steady, or falling).
          </p>
          <p>
            Falling pressure usually means rain approaching; rising pressure means clearing
            skies. This is the same method used on traditional home weather stations.
          </p>
          <p>
            If the station has a rain sensor, its current state (Dry → Heavy) is shown
            separately — that reflects what is happening on the ground right now, not the
            barometric forecast.
          </p>
          <p>
            Local and short-range only. Not a substitute for official meteorological forecasts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
