import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { Code2, FileText, Radio } from 'lucide-react';

const navColumns = [
  {
    title: 'Network',
    links: [
      { label: 'Home', to: '/' },
      { label: 'All stations', to: '/stations' },
      { label: 'My lists', to: '/my-stations' },
    ],
  },
];

const externalLinks = [
  {
    label: 'Draft NIP · weather data',
    href: 'https://github.com/nostr-protocol/nips/pull/2163',
    icon: FileText,
  },
  {
    label: 'Reference firmware',
    href: 'https://github.com/samthomson/weather-station',
    icon: Code2,
  },
  {
    label: 'About Nostr',
    href: 'https://nostr.com',
    icon: Radio,
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto_auto]">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandMark className="h-8 w-8 text-primary" />
              <span className="font-display text-base font-semibold tracking-tight">
                relaying<span className="text-primary">.</span>earth
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              A decentralised mesh of Nostr-powered weather stations broadcasting in
              real time. Open data, open protocol, no API key.
            </p>
          </div>

          {navColumns.map((col) => (
            <div key={col.title} className="min-w-[140px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="min-w-[180px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Protocol
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {externalLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <link.icon className="h-3.5 w-3.5" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[11px] text-muted-foreground">
          <p className="font-mono uppercase tracking-widest">
            kind <span className="text-primary">16158</span> · station ·{' '}
            <span className="text-primary">4223</span> · reading ·{' '}
            <span className="text-primary">36643</span> · list
          </p>
          <p>© {new Date().getFullYear()} relaying.earth — built on Nostr</p>
        </div>
      </div>
    </footer>
  );
}
