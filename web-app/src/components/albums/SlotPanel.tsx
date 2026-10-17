'use client';

// The side panel for one album slot. An empty slot lists coins to fill it
// with, likely matches first. A filled slot shows its coin, and lets the
// collector open it, swap it, or say "not this coin". Same choices as the
// mobile sheets.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import {
  coinSearchText,
  findCandidateCoins,
  mintMarkLetter,
  normalizeText,
  type Album,
  type AlbumSlot,
  type Coin,
  type SlotFill,
} from '@coin-collecting/shared';
import { CoButton, CoinDisc, Eyebrow } from '@/components/co';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export type SlotPanelTarget = { slot: AlbumSlot; fill?: SlotFill } | null;

function coinSub(coin: Coin): string {
  const parts = [String(coin.year || '—')];
  const mark = mintMarkLetter(coin.mintMark);
  if (mark) parts.push(mark);
  if (coin.country) parts.push(coin.country.toUpperCase());
  return parts.join(' · ');
}

function CoinRow({ coin, onPick }: { coin: Coin; onPick: (coin: Coin) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(coin)}
      className="flex w-full items-center gap-3 border-b border-co-line2 px-6 py-2.5 text-left hover:bg-co-bg3"
    >
      <CoinDisc size={36} tone="copper" label={String(coin.year).slice(-2)} imageSrc={coin.obverseImage || undefined} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-co-fg">{coin.specificCoinName || coin.name || coin.denomination}</span>
        <span className="block truncate font-mono text-[9.5px] tracking-[0.08em] text-co-fg3">{coinSub(coin)}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-co-fg4" aria-hidden />
    </button>
  );
}

function AssignList({ album, slot, coins, onPick }: { album: Album; slot: AlbumSlot; coins: Coin[]; onPick: (coin: Coin) => void }) {
  const [query, setQuery] = useState('');
  const { likely, other } = useMemo(() => findCandidateCoins(album, slot, coins), [album, slot, coins]);
  const needle = normalizeText(query);
  const matches = (coin: Coin) => !needle || normalizeText(coinSearchText(coin)).includes(needle);
  const shownLikely = likely.filter(matches);
  const shownOther = other.filter(matches);

  if (coins.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-[14px] text-co-fg3">
        No coins in your collection yet. Add or scan a coin first, then assign it here.
      </p>
    );
  }
  return (
    <>
      <label className="relative mx-6 my-4 block">
        <span className="sr-only">Search your coins</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-co-fg3" aria-hidden />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your coins"
          className="w-full rounded-sm border border-co-line bg-co-bg2 py-2 pl-9 pr-3 text-[14px] text-co-fg placeholder:text-co-fg4 focus:border-co-gold focus:outline-none"
        />
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {shownLikely.length > 0 && (
          <>
            <p className="px-6 pb-2 pt-1 font-mono text-[9.5px] tracking-[0.12em] text-co-fg3">LIKELY MATCHES</p>
            {shownLikely.map(coin => (
              <CoinRow key={coin.id} coin={coin} onPick={onPick} />
            ))}
          </>
        )}
        {shownOther.length > 0 && (
          <>
            <p className="px-6 pb-2 pt-4 font-mono text-[9.5px] tracking-[0.12em] text-co-fg3">
              {likely.length > 0 ? 'ALL COINS' : 'YOUR COINS'}
            </p>
            {shownOther.map(coin => (
              <CoinRow key={coin.id} coin={coin} onPick={onPick} />
            ))}
          </>
        )}
        {shownLikely.length + shownOther.length === 0 && (
          <p className="px-6 py-8 text-center text-[14px] text-co-fg3">No coins match “{query}”.</p>
        )}
      </div>
    </>
  );
}

export function SlotPanel({
  album,
  target,
  coins,
  onAssign,
  onRemove,
  onClose,
}: {
  album: Album;
  target: SlotPanelTarget;
  coins: Coin[];
  onAssign: (slot: AlbumSlot, coin: Coin) => void;
  onRemove: (fill: SlotFill) => void;
  onClose: () => void;
}) {
  // A filled slot opens on its coin; "Choose a different coin" switches to the list.
  const [choosing, setChoosing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const slot = target?.slot;
  const fill = target?.fill;
  const assigning = !fill || choosing;

  const close = () => {
    setChoosing(false);
    setConfirmRemove(false);
    onClose();
  };

  return (
    <Sheet open={!!target} onOpenChange={open => !open && close()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-co-line bg-co-bg p-0 sm:max-w-md">
        <SheetHeader className="border-b border-co-line px-6 py-5 text-left">
          <Eyebrow>{assigning ? 'Fill slot' : fill?.source === 'heuristic' ? 'Auto-matched' : 'In this slot'}</Eyebrow>
          <SheetTitle className="font-display text-[22px] font-normal tracking-[-0.01em]">{slot?.label}</SheetTitle>
          <SheetDescription className="sr-only">
            {assigning ? 'Choose a coin from your collection for this slot.' : 'The coin in this slot.'}
          </SheetDescription>
        </SheetHeader>

        {slot && assigning && (
          <AssignList
            album={album}
            slot={slot}
            coins={coins}
            onPick={coin => {
              onAssign(slot, coin);
              close();
            }}
          />
        )}

        {slot && fill && !assigning && (
          <div className="flex flex-col gap-5 px-6 py-6">
            <div className="flex items-center gap-3">
              <CoinDisc size={56} tone={album.discTone} label={slot.label.slice(0, 4)} imageSrc={fill.coin.obverseImage || undefined} />
              <div className="min-w-0">
                <p className="truncate text-[15px] text-co-fg">{fill.coin.specificCoinName || fill.coin.name}</p>
                <p className="font-mono text-[10px] tracking-[0.08em] text-co-fg3">{coinSub(fill.coin)}</p>
              </div>
            </div>
            {confirmRemove ? (
              <div className="flex flex-col gap-3 rounded-md border border-co-line bg-co-bg2 p-4">
                <p className="text-[14px] text-co-fg">
                  Remove “{fill.coin.specificCoinName || fill.coin.name}” from the {slot.label} slot? The coin stays in your collection.
                </p>
                <div className="flex gap-2">
                  <CoButton variant="ghost" className="flex-1" onClick={() => setConfirmRemove(false)}>
                    Cancel
                  </CoButton>
                  <CoButton
                    className="flex-1 bg-co-c-low text-co-bg2"
                    onClick={() => {
                      onRemove(fill);
                      close();
                    }}
                  >
                    Remove
                  </CoButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href={`/collection/${fill.coin.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-co-gold px-4 py-3 text-sm font-medium text-co-gold-fg hover:brightness-105"
                >
                  View coin
                </Link>
                <CoButton variant="ghost" onClick={() => setChoosing(true)}>
                  Choose a different coin
                </CoButton>
                <CoButton variant="ghost" onClick={() => setConfirmRemove(true)}>
                  Not this coin
                </CoButton>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
