'use client';

// The want list: empty album slots marked "I want this one", grouped by album,
// to print for a coin show or copy into a message. A slot that gets filled
// drops off by itself.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bookmark, Check, ChevronLeft, Copy, Printer, X } from 'lucide-react';
import { resolveWantList, wantCount, wantListText } from '@coin-collecting/shared';
import { Card, CoButton, Eyebrow } from '@/components/co';
import { useCoins } from '@/lib/useCoins';
import { useWantList } from '@/lib/wantList';

export default function WantListPage() {
  const { coins, state } = useCoins();
  const { entries, loaded, error, toggle } = useWantList();
  const groups = useMemo(() => resolveWantList(entries, coins), [entries, coins]);
  const count = wantCount(groups);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wantListText(groups));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: printing still works.
    }
  };

  return (
    <div className="flex flex-col gap-6 print:gap-3">
      <Link href="/albums" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg print:hidden">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Albums
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{loaded && state !== 'loading' ? `${count} wanted` : 'Want list'}</Eyebrow>
          <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Want list</h1>
          <p className="max-w-prose text-[14px] text-co-fg2 print:hidden">
            The coins you&apos;re hunting for. Print it for a coin show, or copy it into a message. Filled slots drop off by themselves.
          </p>
        </div>
        {count > 0 && (
          <div className="flex gap-2 print:hidden">
            <CoButton variant="ghost" onClick={() => void copy()} leading={copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}>
              {copied ? 'Copied' : 'Copy'}
            </CoButton>
            <CoButton onClick={() => window.print()} leading={<Printer className="h-4 w-4" aria-hidden />}>
              Print
            </CoButton>
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-sm border border-co-warn-border bg-co-warn-bg px-3 py-2 text-[13px] text-co-fg print:hidden">
          {error}
        </p>
      )}

      {loaded && state !== 'loading' && count === 0 ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <Bookmark className="h-5 w-5 text-co-gold-text" aria-hidden />
          <p className="text-[15px] text-co-fg">Nothing on your want list yet.</p>
          <p className="text-[14px] text-co-fg3">Open an album, click an empty slot, and choose “I want this one”.</p>
          <Link href="/albums" className="text-[14px] text-co-gold-text hover:underline">
            Go to your albums
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 print:block">
          {groups.map(group => (
            <section key={group.album.id} className="flex flex-col gap-2 print:mb-4 print:break-inside-avoid" aria-labelledby={`want-${group.album.id}`}>
              <div className="flex items-baseline justify-between">
                <h2 id={`want-${group.album.id}`} className="co-eyebrow">
                  {group.album.title}
                </h2>
                <Link href={`/albums/${group.album.id}`} className="font-mono text-[10px] tracking-[0.1em] text-co-gold-text hover:underline print:hidden">
                  OPEN →
                </Link>
              </div>
              <Card className="overflow-hidden print:border-gray-300">
                <ul>
                  {group.items.map((item, i) => (
                    <li key={item.slot.id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-co-line2' : ''}`}>
                      <span className="hidden h-4 w-4 shrink-0 rounded-[3px] border border-gray-500 print:block" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="text-[14px] text-co-fg">{item.title}</span>
                        {item.note && <span className="ml-2 font-mono text-[10px] text-co-fg3">{item.note}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggle(item.albumId, item.slot.id)}
                        className="rounded-full p-1 text-co-fg4 hover:bg-co-bg3 hover:text-co-fg print:hidden"
                        aria-label={`Remove ${item.title} from your want list`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
