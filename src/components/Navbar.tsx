import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RelaySettings } from '@/components/RelaySettings';

interface NavbarProps {
  /**
   * If true, the navbar sits transparently on top of the page content (used on
   * the immersive home page over the globe). On scroll, it gains a translucent
   * background so it stays readable.
   */
  floating?: boolean;
}

const navItems = [
  { to: '/stations', label: 'Stations' },
  { to: '/my-stations', label: 'My lists' },
];

export function Navbar({ floating = false }: NavbarProps) {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-colors',
        floating
          ? 'border-transparent bg-background/0 supports-[backdrop-filter]:bg-background/40 supports-[backdrop-filter]:backdrop-blur'
          : 'border-b border-border bg-background/85 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="relaying.earth home"
        >
          <BrandMark className="h-8 w-8 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight">
              relaying<span className="text-primary">.</span>earth
            </span>
            <span className="hidden text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground sm:block">
              Nostr · weather · network
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
                )}
              </NavLink>
            );
          })}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Relay settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Relay settings</DialogTitle>
                <DialogDescription>
                  Choose which Nostr relays this client reads from and writes to.
                  Toggle defaults on or off, or add your own.
                </DialogDescription>
              </DialogHeader>
              <RelaySettings />
            </DialogContent>
          </Dialog>

          <div className="ml-1 sm:ml-3">
            <LoginArea className="max-w-52" />
          </div>
        </nav>
      </div>
    </header>
  );
}
