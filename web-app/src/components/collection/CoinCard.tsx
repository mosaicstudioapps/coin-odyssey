import Link from 'next/link';
import { coinLabel, metalDiscTone, type Coin } from '@coin-collecting/shared';
import { Card, CoinDisc } from '@/components/co';

/** One coin in the collection grid, like the mobile grid cell. */
export function CoinCard({ coin, formatMoney }: { coin: Coin; formatMoney: (n: number) => string }) {
  const label = coinLabel(coin);
  return (
    <Link
      href={`/collection/${coin.id}`}
      className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-co-gold-text"
      aria-label={`${label}, ${coin.year}`}
    >
      <Card className="flex h-full flex-col gap-3 p-3.5 transition-colors group-hover:border-co-fg4">
        <div className="flex justify-center rounded-sm bg-co-bg3 py-4">
          <CoinDisc
            size={84}
            label={String(coin.year).slice(-2)}
            tone={metalDiscTone(coin)}
            imageSrc={coin.obverseImage ?? undefined}
            imageAlt=""
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-4 text-co-fg">{label}</p>
          <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-co-fg3">
            {coin.country || '—'} · {coin.year}
          </p>
        </div>
        <div className="mt-auto flex items-baseline justify-between gap-2">
          {/* Purchase price is optional and usually unset; an empty slot keeps the grade pinned right. */}
          <span className="font-mono text-[12px] text-co-fg2">
            {coin.purchasePrice != null ? formatMoney(coin.purchasePrice) : ''}
          </span>
          <span className="font-mono text-[11px] text-co-fg3">{coin.grade || '—'}</span>
        </div>
      </Card>
    </Link>
  );
}

export function CoinCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-3.5" aria-hidden>
      <div className="h-[116px] animate-pulse rounded-sm bg-co-bg3" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-co-bg3" />
      <div className="h-2.5 w-1/2 animate-pulse rounded bg-co-bg3" />
    </Card>
  );
}
