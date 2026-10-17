'use client';

// One album: every slot by section, filled from the collection. Click an
// empty slot to fill it, or a filled one to open, swap, or remove its coin.
// The World album fills from country alone and is read-only: a filled slot
// opens its coin.
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  buildSlotAssignment,
  buildSlotRemoval,
  computeAlbumFills,
  getAlbumById,
  type AlbumSlot,
  type Coin,
  type SlotFill,
} from '@coin-collecting/shared';
import { CoButton, CoinDisc, Eyebrow, ProgressBar } from '@/components/co';
import { SlotPanel, type SlotPanelTarget } from '@/components/albums/SlotPanel';
import { updateCoin, type CoinWrite } from '@/lib/coins';
import { useCoins } from '@/lib/useCoins';
import { cn } from '@/lib/utils';

const DISC = 56;

function SlotCell({
  slot,
  fill,
  tone,
  onPress,
}: {
  slot: AlbumSlot;
  fill?: SlotFill;
  tone: 'gold' | 'silver' | 'copper';
  onPress: (slot: AlbumSlot, fill?: SlotFill) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPress(slot, fill)}
      className="group flex flex-col items-center gap-1.5 rounded-md p-1.5 hover:bg-co-bg2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-co-gold"
      aria-label={`${slot.label}${slot.sublabel ? ` ${slot.sublabel}` : ''}, ${fill ? 'filled' : 'empty'}`}
    >
      {fill ? (
        <span className="relative">
          <CoinDisc
            size={DISC}
            tone={tone}
            label={slot.match.kind === 'country' ? '' : slot.label.slice(0, 4)}
            imageSrc={fill.coin.obverseImage || undefined}
          />
          <span className="absolute right-px top-px h-2 w-2 rounded-full border-[1.5px] border-co-bg bg-co-gold" aria-hidden />
          {fill.coinCount != null && fill.coinCount > 1 && (
            <span className="absolute -bottom-0.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-co-line bg-co-bg4 px-1 font-mono text-[8.5px] text-co-fg2">
              {fill.coinCount}
            </span>
          )}
        </span>
      ) : (
        <span
          className="flex items-center justify-center rounded-full border border-dashed border-co-empty-ring font-mono text-[14px] text-co-fg4 group-hover:border-co-fg4"
          style={{ width: DISC, height: DISC }}
          aria-hidden
        >
          ·
        </span>
      )}
      <span className={cn('line-clamp-2 text-center font-mono text-[9px] uppercase leading-[11px] tracking-[0.04em]', fill ? 'text-co-fg2' : 'text-co-fg4')}>
        {slot.label}
      </span>
      {slot.sublabel && <span className="-mt-1 truncate font-mono text-[8px] tracking-[0.03em] text-co-fg4">{slot.sublabel}</span>}
    </button>
  );
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const album = useMemo(() => getAlbumById(id), [id]);
  const { coins, setCoins, state, reload } = useCoins();
  const [target, setTarget] = useState<SlotPanelTarget>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const fills = useMemo(() => (album ? computeAlbumFills(album, coins) : new Map<string, SlotFill>()), [album, coins]);

  /** Patch the coin on screen at once, save it, and put it back if the save fails. */
  const writeCoin = useCallback(
    async (coinId: string, updates: CoinWrite, failure: string) => {
      setWriteError(null);
      let previous: Coin[] = [];
      setCoins(current => {
        previous = current;
        return current.map(c => (c.id === coinId ? { ...c, ...(updates as Partial<Coin>) } : c));
      });
      try {
        await updateCoin(coinId, updates);
      } catch {
        setCoins(previous);
        setWriteError(failure);
      }
    },
    [setCoins]
  );

  const onSlot = useCallback(
    (slot: AlbumSlot, fill?: SlotFill) => {
      if (album?.kind === 'world') {
        if (fill) router.push(`/collection/${fill.coin.id}`);
        return;
      }
      setTarget({ slot, fill });
    },
    [album, router]
  );

  if (!album) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-[26px]">Album not found</h1>
        <Link href="/albums" className="font-mono text-[11px] uppercase tracking-[0.1em] text-co-gold-text">
          Back to albums
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/albums" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Albums
      </Link>
      <header className="flex flex-col gap-2">
        <Eyebrow>{album.subtitle}</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">{album.title}</h1>
        <p className="font-mono text-[11px] tracking-[0.08em] text-co-fg2">
          {fills.size} / {album.totalSlots} collected
        </p>
        <div className="max-w-md">
          <ProgressBar value={album.totalSlots > 0 ? fills.size / album.totalSlots : 0} label={`${album.title} progress`} />
        </div>
        {album.kind === 'world' && (
          <p className="text-[13px] text-co-fg3">Fills from each coin&apos;s country. Click a filled country to open its coin.</p>
        )}
      </header>

      {(state === 'error' || writeError) && (
        <div role="alert" className="flex items-center gap-3 rounded-sm border border-co-warn-border bg-co-warn-bg px-3 py-2 text-[13px] text-co-fg">
          <span className="flex-1">{writeError ?? 'Could not load your coins.'}</span>
          {state === 'error' && !writeError && (
            <CoButton variant="ghost" className="py-1.5" onClick={() => void reload()}>
              Retry
            </CoButton>
          )}
        </div>
      )}

      {album.sections.map(section => {
        const filled = section.slots.filter(slot => fills.has(slot.id)).length;
        return (
          <section key={section.id} className="flex flex-col gap-3" aria-label={section.title}>
            <div className="flex items-baseline justify-between border-b border-co-line pb-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-co-fg2">{section.title}</h2>
              <span className="font-mono text-[10px] text-co-fg3">
                {filled}/{section.slots.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {section.slots.map(slot => (
                <SlotCell key={slot.id} slot={slot} fill={fills.get(slot.id)} tone={album.discTone} onPress={onSlot} />
              ))}
            </div>
          </section>
        );
      })}

      <SlotPanel
        album={album}
        target={target}
        coins={coins}
        onClose={() => setTarget(null)}
        onAssign={(slot, coin) => {
          const assignment = buildSlotAssignment(album, slot);
          if (assignment) void writeCoin(coin.id, assignment, 'Could not assign the coin to this slot. Please try again.');
        }}
        onRemove={fill => void writeCoin(fill.coin.id, buildSlotRemoval(), 'Could not remove the coin from this slot. Please try again.')}
      />
    </div>
  );
}
