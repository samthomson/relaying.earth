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

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
}

export function AppSettingsDialog({
  open,
  onOpenChange,
  trigger,
}: AppSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure relays, units, and other client preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="relays">
          <TabsList className="w-full">
            <TabsTrigger value="relays" className="flex-1">
              Relays
            </TabsTrigger>
            <TabsTrigger value="general" className="flex-1">
              General
            </TabsTrigger>
          </TabsList>
          <TabsContent value="relays" className="mt-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Choose which Nostr relays this client reads from and writes to.
              Toggle defaults on or off, or add your own.
            </p>
            <RelaySettings />
          </TabsContent>
          <TabsContent value="general" className="mt-4">
            <GeneralSettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
