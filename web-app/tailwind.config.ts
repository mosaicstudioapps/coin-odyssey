import type { Config } from 'tailwindcss';
import { darkPalette } from '../packages/shared/src/theme/tokens';

// Colors are CSS variables set from the shared palettes (src/theme/themeCss.ts),
// so light and dark switch without any `dark:` classes. Tailwind fills in
// <alpha-value> (1 when there's no modifier), so color-mix keeps opacity
// modifiers like bg-primary/90 working on plain hex values.
function cssVar(name: string): string {
  return `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;
}

function kebab(token: string): string {
  return token.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Every palette token as `co-<name>`: bg-co-bg2, text-co-fg3, text-co-gold-text… */
const coColors = Object.fromEntries(
  Object.keys(darkPalette).map(token => [kebab(token), cssVar(`--co-${kebab(token)}`)])
);

const semantic = (name: string) => cssVar(`--${name}`);

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        co: coColors,
        background: semantic('background'),
        foreground: semantic('foreground'),
        card: { DEFAULT: semantic('card'), foreground: semantic('card-foreground') },
        popover: { DEFAULT: semantic('popover'), foreground: semantic('popover-foreground') },
        primary: { DEFAULT: semantic('primary'), foreground: semantic('primary-foreground') },
        secondary: { DEFAULT: semantic('secondary'), foreground: semantic('secondary-foreground') },
        muted: { DEFAULT: semantic('muted'), foreground: semantic('muted-foreground') },
        accent: { DEFAULT: semantic('accent'), foreground: semantic('accent-foreground') },
        destructive: { DEFAULT: semantic('destructive'), foreground: semantic('destructive-foreground') },
        border: semantic('border'),
        input: semantic('input'),
        ring: semantic('ring'),
        sidebar: {
          DEFAULT: semantic('sidebar-background'),
          foreground: semantic('sidebar-foreground'),
          primary: semantic('sidebar-primary'),
          'primary-foreground': semantic('sidebar-primary-foreground'),
          accent: semantic('sidebar-accent'),
          'accent-foreground': semantic('sidebar-accent-foreground'),
          border: semantic('sidebar-border'),
          ring: semantic('sidebar-ring'),
        },
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // The mobile radius scale: sm 10, base 14, lg 20.
        lg: '20px',
        md: '14px',
        sm: '10px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
