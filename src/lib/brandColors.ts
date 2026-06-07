/**
 * Brand palette — must stay in sync with :root tokens in src/index.css.
 * Use these for SVG fills and Three.js colours that can't read CSS variables.
 */
export const brandColors = {
  orange: 'hsl(22 96% 52%)',
  /** Hex for Three.js — space-separated hsl() parses as white in THREE.Color. */
  orangeHex: '#fa7b08',
  purple: 'hsl(275 55% 52%)',
  purpleDark: 'hsl(275 45% 28%)',
  maroon: 'hsl(348 58% 48%)',
  maroonHex: '#c13350',
  grey: 'hsl(220 8% 42%)',
  greyLight: 'hsl(220 10% 78%)',
  greyMuted: 'hsl(220 10% 93%)',
  paper: 'hsl(0 0% 98%)',
  white: 'hsl(0 0% 100%)',
  foreground: 'hsl(24 10% 10%)',
} as const;
