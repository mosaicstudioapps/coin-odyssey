'use client';

// The ten series checklists, each with how much of it the collection fills.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { albumInView, buildAlbums, computeAlbumProgress, type AlbumView } from '@coin-collecting/shared';
import { Card, CoButton, CoinDisc, Eyebrow, ProgressBar } from '@/components/co';
import { Bookmark } from 'lucide-react';
import { resolveWantList, wantCount } from '@coin-collecting/shared';
import { DEFAULT_ALBUM_VIEW, readAlbumView } from '@/lib/albumView';
import { useWantList } from '@/lib/wantList';
import { useCoins } from '@/lib/useCoins';
import { cn } from '@/lib/utils';

export default function AlbumsPage() {
  const { coins, state, reload } = useCoins();
  const baseAlbums = useMemo(() => buildAlbums(), []);
  // Each quarter album in the layout its page was last left in (by mint by default).
  const [views, setViews] = useState<AlbumView[]>(() =>
    baseAlbums.map(album => (album.mintVariants ? DEFAULT_ALBUM_VIEW : 'design'))
  );
  useEffect(() => setViews(baseAlbums.map(readAlbumView)), [baseAlbums]);
  const albums = useMemo(() => baseAlbums.map((album, i) => albumInView(album, views[i])), [baseAlbums, views]);
  const progress = useMemo(() => albums.map(album => computeAlbumProgress(album, coins)), [albums, coins]);
  const { entries } = useWantList();
  const wants = useMemo(() => wantCount(resolveWantList(entries, coins, baseAlbums)), [entries, coins, baseAlbums]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Series checklists</Eyebrow>
          <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Albums</h1>
        </div>
        <Link
          href="/albums/want-list"
          className="inline-flex items-center gap-2 rounded-full border border-co-line bg-co-bg2 px-4 py-2.5 text-sm text-co-fg hover:border-co-fg4"
        >
          <Bookmark className="h-4 w-4 text-co-gold-text" aria-hidden /> Want list{wants > 0 ? ` · ${wants}` : ''}
        </Link>
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
                      <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-co-fg3">
                        {album.subtitle}
                        {album.view === 'mint' && ' · P & D'}
                      </p>
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
