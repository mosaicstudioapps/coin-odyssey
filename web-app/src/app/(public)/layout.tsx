// The public site: the landing page and the checklists. Open to everyone and
// built for search. Safari on iPhone shows the Smart App Banner offering the
// app.
import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountLink } from '@/components/public/AccountLink';
import { StoreBadges } from '@/components/public/StoreBadges';
import { APP_STORE_ID } from '@/lib/checklists';

export const metadata: Metadata = {
  itunes: { appId: APP_STORE_ID },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-co-bg">
      <header className="border-b border-co-line print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/app-icon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-[7px]" />
            <span className="font-mono text-[11px] tracking-[0.2em] text-co-fg">COIN ODYSSEY</span>
          </Link>
          <nav className="flex items-center gap-2 md:gap-4" aria-label="Site">
            <Link href="/checklists" className="px-2 py-2 text-[14px] text-co-fg2 hover:text-co-fg">
              Checklists
            </Link>
            <AccountLink />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-co-line print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[11px] tracking-[0.2em] text-co-fg2">COIN ODYSSEY</p>
            <p className="text-[13px] text-co-fg3">A Mosaic Studio app. Education first: no prices, no valuations.</p>
            <nav className="flex gap-4 text-[13px]" aria-label="Legal">
              <a href="/privacy" className="text-co-fg3 hover:text-co-fg">Privacy</a>
              <a href="/terms" className="text-co-fg3 hover:text-co-fg">Terms</a>
              <a href="/contact" className="text-co-fg3 hover:text-co-fg">Contact</a>
            </nav>
          </div>
          <StoreBadges />
        </div>
      </footer>
    </div>
  );
}
