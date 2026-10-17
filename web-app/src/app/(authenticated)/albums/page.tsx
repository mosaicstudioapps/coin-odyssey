'use client';

// The ten series checklists, each with how much of it the collection fills.
import Link from 'next/link';
import { useMemo } from 'react';
import { buildAlbums, computeAlbumProgress } from '@coin-collecting/shared';
import { Card, CoButton, CoinDisc, Eyebrow, ProgressBar } from '@/components/co';
import { useCoins } from '@/lib/useCoins';
import { cn } from '@/lib/utils';

export default function AlbumsPage() {
  const { coins, state, reload } = useCoins();
  const albums = useMemo(() => buildAlbums(), []);
  const progress = useMemo(() => albums.map(album => computeAlbumProgress(album, coins)), [albums, coins]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <Eyebrow>Series checklists</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Albums</h1>
      </header>

      {state === 'error' ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-co-fg">Could not load your collection.</p>
          <p className="text-[14px] text-co-fg3">Check your connection and try again.</p>
          <CoButton onClick={() => void reload()}>Retry</CoButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((album, i) => {
            const filled = progress[i].filled;
            const complete = filled >= album.totalSlots;
            return (
              <Link key={album.id} href={`/albums/${album.id}`} className="group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-co-gold">
                <Card className="flex h-full flex-col gap-3 p-4 transition group-hover:border-co-fg4">
                  <div className="flex items-center gap-3">
                    <CoinDisc size={44} tone={album.discTone} label={album.title.slice(0, 2)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[17px] tracking-[-0.01em] text-co-fg">{album.title}</p>
                      <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-co-fg3">{album.subtitle}</p>
                    </div>
                    <span className={cn('font-mono text-[12px]', complete ? 'text-co-gold-text' : 'text-co-fg2')}>
                      {state === 'loading' ? '—' : filled}/{album.totalSlots}
                    </span>
                  </div>
                  <ProgressBar value={album.totalSlots > 0 ? filled / album.totalSlots : 0} label={`${album.title} progress`} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
