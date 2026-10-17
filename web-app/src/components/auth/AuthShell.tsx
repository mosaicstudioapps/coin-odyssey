// The frame around every sign-in screen: the app's mark and promise on the
// left on a desktop, the form on the right. Phones get the form alone, under
// the wordmark, like the mobile app.
import Link from 'next/link';
import { CoinDisc, Eyebrow } from '@/components/co';

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-co-bg lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-co-line bg-gradient-to-br from-co-cta-top-warm to-co-bg p-12 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <img src="/app-icon.png" alt="" className="h-9 w-9 rounded-[9px]" />
          <span className="font-mono text-[12px] tracking-[0.2em] text-co-fg2">COIN ODYSSEY</span>
        </Link>
        <div className="flex max-w-md flex-col gap-4">
          <p className="font-display text-[40px] leading-[1.1] tracking-[-0.02em] text-co-fg">
            Photograph a coin, learn its story, and catalog your collection.
          </p>
          <p className="text-[15px] text-co-fg2">The same collection as the app on your phone, kept in sync.</p>
        </div>
        <div className="pointer-events-none absolute -bottom-16 -right-16 opacity-80" aria-hidden>
          <CoinDisc size={280} tone="gold" label="1964" />
        </div>
        <p className="font-mono text-[10px] tracking-[0.12em] text-co-fg4">MOSAIC STUDIO</p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <img src="/app-icon.png" alt="" className="h-7 w-7 rounded-[7px]" />
            <span className="font-mono text-[11px] tracking-[0.2em] text-co-fg2">COIN ODYSSEY</span>
          </Link>
          <header className="flex flex-col gap-2">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="font-display text-[32px] leading-tight tracking-[-0.02em] text-co-fg">{title}</h1>
            {subtitle && <p className="text-[15px] text-co-fg2">{subtitle}</p>}
          </header>
          {children}
          {footer && <div className="text-center text-[14px] text-co-fg3">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** An error or notice above an auth form. */
export function AuthNotice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'rounded-sm border border-co-c-low bg-co-bg2 px-3 py-2.5 text-[14px] text-co-fg'
          : 'rounded-sm border border-co-gold-dim bg-co-chip-active-bg px-3 py-2.5 text-[14px] text-co-fg'
      }
    >
      {children}
    </p>
  );
}

export const authLink = 'text-co-gold-text hover:underline';
