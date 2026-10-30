import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { THEME_BOOTSTRAP, THEME_CSS } from '@/theme/themeCss';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { SITE_URL } from '@/lib/checklists';
import { SiteAnalytics } from '@/components/SiteAnalytics';

// The mobile app's three faces: Newsreader for display, DM Sans for UI,
// JetBrains Mono for labels and numbers. Bundled in ./fonts (Latin variable
// files from Google Fonts, SIL Open Font License alongside) rather than
// next/font/google, which downloads them at build time and fails the build
// whenever Google Fonts hiccups.
const display = localFont({
  src: './fonts/Newsreader-latin.woff2',
  weight: '400 500',
  variable: '--font-display',
  adjustFontFallback: 'Times New Roman',
});
const ui = localFont({ src: './fonts/DMSans-latin.woff2', weight: '400 600', variable: '--font-ui' });
const mono = localFont({ src: './fonts/JetBrainsMono-latin.woff2', weight: '400 500', variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Coin Odyssey', template: '%s · Coin Odyssey' },
  description: 'Photograph a coin, learn its story, and catalog your collection.',
  applicationName: 'Coin Odyssey',
  openGraph: { siteName: 'Coin Odyssey', type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The bootstrap script may set data-theme before React hydrates.
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <style id="co-theme" dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen bg-co-bg font-sans text-co-fg antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
