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
  'h-9 flex-1 rounded-md border-0 px-4 text-sm font-medium shadow-none',
  'text-muted-foreground transition-colors hover:text-foreground',
  'data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none',
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
        </DialogHeader>

        <Tabs defaultValue="relays">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-muted/30 px-3 py-3">
              <TabsList className="flex h-auto w-full gap-1 rounded-lg bg-muted/60 p-1">
                <TabsTrigger value="relays" className={tabTriggerClass}>
                  Relays
                </TabsTrigger>
                <TabsTrigger value="general" className={tabTriggerClass}>
                  General
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-[28rem] overflow-y-auto p-4 transition-[min-height] duration-300 ease-in-out">
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
