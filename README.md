# relaying.earth

A Nostr client for relaying.earth — a live, decentralised network of Nostr-powered weather stations relaying the planet's weather in real time.

## Stack

- React 19 · TypeScript · Vite
- TailwindCSS 4 · shadcn/ui
- Nostrify · TanStack Query · React Router

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Project docs

- [`AGENTS.md`](./AGENTS.md) — project conventions, Nostr integration guidelines, and security rules
- [`NIP.md`](./NIP.md) — custom Nostr kinds and schemas (if any)

## Design

The app uses a single light theme. Brand palette: white, orange, purple, grey, black, maroon.

## TODO

- [ ] react globe gl?
- [ ] sort hte folowing
- [ ] Wire up real weather station data sources
- [ ] Add station detail page
- [ ] Implement station favouriting / list management
- [ ] Add map view for station locations on the station page

- [ ] src/components/Navbar.tsx still has light/dark stuff
- [ ] src/components/WeatherGlobe.tsx has a bunch of extenral assets eg unpkg and looks messy in general. make a more succinct map implementation