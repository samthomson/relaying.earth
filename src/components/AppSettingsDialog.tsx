import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  'h-10 flex-1 rounded-md border-0 bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none',
  'transition-colors hover:text-foreground',
  'data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-brand-maroon',
  'data-[state=active]:shadow-none',
  'after:hidden',
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
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure relays, units, and other client preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="relays">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <TabsList className="flex h-auto w-full gap-1 rounded-none border-0 bg-muted/50 p-1.5">
              <TabsTrigger value="relays" className={tabTriggerClass}>
                Relays
              </TabsTrigger>
              <TabsTrigger value="general" className={tabTriggerClass}>
                General
              </TabsTrigger>
            </TabsList>

            <div className="min-h-[28rem] overflow-y-auto p-4 transition-[min-height] duration-300 ease-in-out">
              <TabsContent value="relays" className="mt-0 outline-none">
                <p className="mb-4 text-sm text-muted-foreground">
                  Choose which Nostr relays this client reads from and writes to.
                  Toggle defaults on or off, or add your own.
                </p>
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
