'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Plus, ScanLine, Search, SlidersHorizontal } from 'lucide-react';
import {
  QUICK_CHIPS,
  collectionCountries,
  countActiveFilters,
  defaultFilters,
  defaultSort,
  filterCollection,
  type Coin,
  type CoinFilters,
  type SortOption,
} from '@coin-collecting/shared';
import { CoinDisc, Eyebrow } from '@/components/co';
import { CoinCard, CoinCardSkeleton } from '@/components/collection/CoinCard';
import { FilterPanel } from '@/components/collection/FilterPanel';
import { SortMenu } from '@/components/collection/SortMenu';
import { getUserCoins, onCoinsChanged, subscribeToCoins } from '@/lib/coins';
import { useCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

type LoadState = 'loading' | 'error' | 'ready';

export default function CollectionPage() {
  const { format } = useCurrency();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<string>('All');
  const [filters, setFilters] = useState<CoinFilters>(defaultFilters);
  const [sort, setSort] = useState<SortOption>(defaultSort);
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setCoins(await getUserCoins());
      setState('ready');
    } catch {
      setState(current => (current === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    void load();
    // Refresh after a save in this tab, and on changes from other devices.
    const offLocal = onCoinsChanged(() => void load());
    const offLive = subscribeToCoins(() => void load());
    return () => {
      offLocal();
      offLive();
    };
  }, [load]);

  const visible = useMemo(() => filterCollection(coins, { query, chip, filters, sort }), [coins, query, chip, filters, sort]);
  const countries = useMemo(() => collectionCountries(coins), [coins]);
  const activeFilters = countActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Collection · {coins.length}</Eyebrow>
          <h1 className="font-display text-[30px] leading-none tracking-[-0.02em]">Catalog</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/collection/import-export"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-co-fg2 hover:bg-co-bg2 hover:text-co-fg"
          >
            <ArrowDownUp className="h-4 w-4" aria-hidden /> Import / export
          </Link>
          <Link
            href="/collection/add"
            className="inline-flex items-center gap-2 rounded-full border border-co-line bg-co-bg2 px-4 py-2.5 text-sm text-co-fg hover:border-co-fg4"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add coin
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-64">
          <span className="sr-only">Search the collection</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-co-fg3" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, country, year…"
            className="h-10 w-full rounded-full border border-co-line bg-co-bg2 pl-10 pr-4 text-sm text-co-fg placeholder:text-co-fg3 focus:outline-none focus-visible:border-co-gold-text"
          />
        </label>
        <SortMenu sort={sort} onChange={setSort} />
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={cn(
            'relative inline-flex h-10 items-center gap-2 rounded-full border bg-co-bg2 px-4 font-mono text-[10.5px] uppercase tracking-[0.1em] hover:border-co-fg4',
            activeFilters > 0 ? 'border-co-gold-deep text-co-gold-text' : 'border-co-line text-co-fg2'
          )}
          aria-label={activeFilters > 0 ? `Filters, ${activeFilters} active` : 'Filters'}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filter
          {activeFilters > 0 && (
            <span className="ml-0.5 rounded-full bg-co-gold px-1.5 text-[10px] leading-4 text-co-gold-fg">{activeFilters}</span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quick filters">
        {QUICK_CHIPS.map(name => {
          const on = chip === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChip(name)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors',
                on ? 'border-co-gold-deep bg-co-chip-active-bg text-co-gold-text' : 'border-co-line text-co-fg2 hover:border-co-fg4'
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      {state === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <CoinCardSkeleton key={i} />
          ))}
        </div>
      ) : state === 'error' ? (
        <EmptyState title="Could not load your collection" body="Check your connection and try again.">
          <button type="button" onClick={() => void load()} className="font-mono text-[11px] uppercase tracking-[0.1em] text-co-gold-text">
            Try again
          </button>
        </EmptyState>
      ) : coins.length === 0 ? (
        <EmptyState
          title="Your collection is empty"
          body="Scan a coin to identify and catalog it automatically, or add one yourself if you already know the details."
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/scan" className="inline-flex items-center gap-2 rounded-full bg-co-gold px-4 py-2.5 text-sm font-medium text-co-gold-fg">
              <ScanLine className="h-4 w-4" aria-hidden /> Scan a coin
            </Link>
            <Link href="/collection/add" className="inline-flex items-center gap-2 rounded-full border border-co-line px-4 py-2.5 text-sm text-co-fg">
              <Plus className="h-4 w-4" aria-hidden /> Add manually
            </Link>
          </div>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title="No matches" body="Adjust your search, filters, or quick chips." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map(coin => (
            <li key={coin.id}>
              <CoinCard coin={coin} formatMoney={n => format(n)} />
            </li>
          ))}
        </ul>
      )}

      <FilterPanel open={filterOpen} onOpenChange={setFilterOpen} filters={filters} countries={countries} onApply={setFilters} />
    </div>
  );
}

function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-co-line px-6 py-16 text-center">
      <CoinDisc size={64} label="??" tone="copper" />
      <h2 className="font-display text-[22px] tracking-[-0.01em]">{title}</h2>
      <p className="max-w-md text-[14px] text-co-fg2">{body}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
