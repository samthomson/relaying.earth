import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from '@/components/GeneralSettings';
import { RelaySettings } from '@/components/RelaySettings';
import { cn } from '@/lib/utils';

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
}

const tabTriggerClass = cn(
  'h-auto border-0 p-0 shadow-none after:hidden',
);

const tabButtonClass = cn(
  'settings-tab flex min-h-10 w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium',
  'text-muted-foreground transition-colors hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-0',
);

export function AppSettingsDialog({
  open,
  onOpenChange,
  trigger,
}: AppSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden sm:max-w-xl">
        <DialogHeader className="pb-2">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="relays">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <TabsList className="grid !h-auto w-full grid-cols-2 gap-1.5 rounded-none border-0 bg-muted p-1.5 shadow-none">
              <TabsTrigger value="relays" asChild className={tabTriggerClass}>
                <button type="button" className={tabButtonClass}>
                  Relays
                </button>
              </TabsTrigger>
              <TabsTrigger value="general" asChild className={tabTriggerClass}>
                <button type="button" className={tabButtonClass}>
                  General
                </button>
              </TabsTrigger>
            </TabsList>

            <div className="min-h-[28rem] overflow-y-auto px-4 py-4 transition-[min-height] duration-300 ease-in-out">
              <TabsContent value="relays" className="mt-0 outline-none">
                <RelaySettings />
              </TabsContent>
              <TabsContent value="general" className="mt-0 outline-none">
                <GeneralSettings />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
