import { darkPalette, lightPalette, type Palette } from '@coin-collecting/shared';

// The shared palettes, as CSS custom properties. Generated rather than
// hand-copied, so the web can't drift from the mobile app's colors.
//
// Every token becomes `--co-<name>` (goldText -> --co-gold-text). Light is
// the default; dark applies when the system prefers it unless the user chose
// Light, or whenever the user chose Dark. The data-theme attribute is set by
// THEME_BOOTSTRAP before first paint.

export const THEME_STORAGE_KEY = 'co-theme';

export function cssVarName(token: string): string {
  return `--co-${token.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

function tokenDeclarations(palette: Palette): string {
  return Object.entries(palette)
    .map(([token, value]) => `${cssVarName(token)}:${value};`)
    .join('');
}

/** Shadcn's semantic names, pointed at our tokens so its primitives match the app. */
const SEMANTIC: Record<string, string> = {
  background: 'bg',
  foreground: 'fg',
  card: 'bg2',
  'card-foreground': 'fg',
  popover: 'bg2',
  'popover-foreground': 'fg',
  primary: 'gold',
  'primary-foreground': 'goldFg',
  secondary: 'bg3',
  'secondary-foreground': 'fg',
  muted: 'bg3',
  'muted-foreground': 'fg3',
  accent: 'bg3',
  'accent-foreground': 'fg',
  destructive: 'cLow',
  'destructive-foreground': 'bg2',
  border: 'line',
  input: 'line',
  ring: 'goldText',
  'sidebar-background': 'bg2',
  'sidebar-foreground': 'fg2',
  'sidebar-primary': 'gold',
  'sidebar-primary-foreground': 'goldFg',
  'sidebar-accent': 'bg3',
  'sidebar-accent-foreground': 'fg',
  'sidebar-border': 'line',
  'sidebar-ring': 'goldText',
};

const semanticDeclarations = Object.entries(SEMANTIC)
  .map(([name, token]) => `--${name}:var(${cssVarName(token)});`)
  .join('');

export const THEME_CSS = [
  `:root{${tokenDeclarations(lightPalette)}${semanticDeclarations}--radius:14px;color-scheme:light;}`,
  `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${tokenDeclarations(darkPalette)}color-scheme:dark;}}`,
  `:root[data-theme="dark"]{${tokenDeclarations(darkPalette)}color-scheme:dark;}`,
].join('\n');

/**
 * Runs in <head> before the page paints, so a saved Light or Dark choice
 * never flashes the other theme. "System" leaves the attribute off and the
 * media query decides.
 */
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}`;
