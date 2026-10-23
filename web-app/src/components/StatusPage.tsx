// The look of the "not found" and "something went wrong" pages: a blank coin,
// a short line, and a way back.
import Link from 'next/link';
import { CoinDisc } from '@/components/co';

export function StatusPage({
  stamp,
  eyebrow,
  title,
  body,
  actions,
  fullScreen = true,
}: {
  stamp: string;
  eyebrow: string;
  title: string;
  body: string;
  actions: React.ReactNode;
  /** False inside the app shell, where the sidebar already frames the page. */
  fullScreen?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 px-4 text-center ${fullScreen ? 'min-h-screen bg-co-bg py-16' : 'py-20'}`}>
      {fullScreen && (
        <Link href="/" className="mb-4 flex items-center gap-2.5">
          <img src="/app-icon.png" alt="" width={28} height={28} className="h-7 w-7 rounded-[7px]" />
          <span className="font-mono text-[11px] tracking-[0.2em] text-co-fg2">COIN ODYSSEY</span>
        </Link>
      )}
      <CoinDisc size={120} tone="copper" label={stamp} />
      <div className="flex max-w-md flex-col gap-2">
        <p className="co-eyebrow">{eyebrow}</p>
        <h1 className="font-display text-[32px] leading-tight tracking-[-0.02em] text-co-fg">{title}</h1>
        <p className="text-[15px] text-co-fg2">{body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}

export const statusPrimary =
  'inline-flex items-center justify-center rounded-full bg-co-gold px-5 py-3 text-sm font-medium text-co-gold-fg hover:brightness-105';
export const statusSecondary =
  'inline-flex items-center justify-center rounded-full border border-co-line px-5 py-3 text-sm text-co-fg hover:bg-co-bg2';
