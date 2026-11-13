import { ExternalLink, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StationMapSvg } from '@/components/StationMiniMap';

interface StationMapDialogProps {
  geohash: string;
  lat: number;
  lng: number;
  /** Clickable inline map that opens the dialog. */
  children: React.ReactNode;
}

/**
 * Opens the station's location map in a dialog so the user isn't navigated
 * away; a direct OpenStreetMap link stays available as a fallback.
 */
export function StationMapDialog({ geohash, lat, lng, children }: StationMapDialogProps) {
  const osmHref = `https://www.openstreetmap.org/?mlat=${lat.toFixed(4)}&mlon=${lng.toFixed(4)}#map=11/${lat.toFixed(4)}/${lng.toFixed(4)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border/60 bg-muted/30 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open larger map of station location ${geohash}`}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <MapPin className="h-4 w-4 text-primary" />
            Station location · {geohash}
          </DialogTitle>
          <DialogDescription>
            {lat.toFixed(4)}, {lng.toFixed(4)} — geohash cell {geohash}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <StationMapSvg geohash={geohash} lat={lat} lng={lng} />
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <a href={osmHref} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3.5 w-3.5" />
              Open in OpenStreetMap
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
