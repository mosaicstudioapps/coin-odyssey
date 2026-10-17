import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Newsreader } from 'next/font/google';
import './globals.css';
import { THEME_BOOTSTRAP, THEME_CSS } from '@/theme/themeCss';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { SITE_URL } from '@/lib/checklists';

// The mobile app's three faces: Newsreader for display, DM Sans for UI,
// JetBrains Mono for labels and numbers.
const display = Newsreader({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-display' });
const ui = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-ui' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

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
      </body>
    </html>
  );
}
