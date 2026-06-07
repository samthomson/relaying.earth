import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { GeneralSettings } from '@/components/GeneralSettings';
import { RelaySettings } from '@/components/RelaySettings';
import { cn } from '@/lib/utils';

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
}

const tabs = [
  { value: 'relays', label: 'Relays' },
  { value: 'general', label: 'General' },
] as const;

type SettingsTab = (typeof tabs)[number]['value'];

export function AppSettingsDialog({
  open,
  onOpenChange,
  trigger,
}: AppSettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>('relays');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden sm:max-w-xl">
        <DialogHeader className="pb-2">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)}>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div
              className="grid grid-cols-2 gap-1 bg-muted p-1"
              role="tablist"
              aria-label="Settings sections"
            >
              {tabs.map(({ value, label }) => {
                const active = tab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(value)}
                    className={cn(
                      'h-9 rounded-md px-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-card font-semibold text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

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
