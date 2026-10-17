'use client';

// The coverage map: where the collection's coins come from. Click a pin or a
// row to focus that country. Same rows and figures as the mobile map.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { COUNTRY_PINS, MAP_FRONTIERS, WORLD_COUNTRY_TOTAL, buildCountryRows } from '@coin-collecting/shared';
import { Card, Eyebrow, WorldMap } from '@/components/co';
import { useCoins } from '@/lib/useCoins';
import { cn } from '@/lib/utils';

function FocusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow>{label}</Eyebrow>
      <span className="font-display text-[24px] leading-none text-co-fg">{value}</span>
    </div>
  );
}

export default function MapPage() {
  const { coins, state } = useCoins();
  const [picked, setPicked] = useState<string | null>(null);

  const { rows, codes } = useMemo(() => {
    // Every country counts, not just the ones with a pin; pins only decide
    // what can be drawn.
    const list = buildCountryRows(coins);
    return { rows: list, codes: list.map(r => r.code).filter(code => COUNTRY_PINS[code]) };
  }, [coins]);

  useEffect(() => {
    if (!picked && rows.length > 0) setPicked(rows[0].code);
  }, [rows, picked]);

  const focus = rows.find(r => r.code === picked);
  const pickedPin = picked ? COUNTRY_PINS[picked] : undefined;
  const total = rows.length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <header className="flex flex-col gap-1.5">
        <Eyebrow>Coverage</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">World map</h1>
        <p className="font-mono text-[11px] tracking-[0.08em] text-co-fg3">
          <span className="text-[13px] text-co-fg">{total}</span> OF {WORLD_COUNTRY_TOTAL} COUNTRIES ·{' '}
          {((total / WORLD_COUNTRY_TOTAL) * 100).toFixed(1)}%
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rounded-md border border-co-line bg-gradient-to-b from-co-map-bg to-co-bg p-3">
            <WorldMap
              size="full"
              collected={codes}
              highlight={picked}
              onPin={code => setPicked(code)}
            />
          </div>

          {(focus || pickedPin) && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <Eyebrow>Focused</Eyebrow>
                <span className="font-mono text-[11px] text-co-fg3">{picked}</span>
              </div>
              <p className="mt-1 font-display text-[24px] text-co-fg">{focus?.name ?? pickedPin?.label}</p>
              {focus ? (
                <div className="mt-4 flex gap-8">
                  <FocusStat label="Coins" value={String(focus.coins)} />
                  <FocusStat label="Earliest" value={focus.earliest ? String(focus.earliest) : '—'} />
                  <FocusStat label="Latest" value={focus.latest ? String(focus.latest) : '—'} />
                </div>
              ) : (
                <p className="mt-2 text-[14px] text-co-fg3">Not in your collection yet.</p>
              )}
            </Card>
          )}

          <section className="flex flex-col gap-2.5" aria-labelledby="frontiers">
            <h2 id="frontiers" className="co-eyebrow">Next frontiers</h2>
            <div className="flex flex-wrap gap-2">
              {MAP_FRONTIERS.map(name => (
                <span key={name} className="rounded-full border border-co-line bg-co-bg2 px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] text-co-fg2">
                  {name}
                </span>
              ))}
            </div>
          </section>
        </div>

        <section className="flex min-w-0 flex-col gap-2 self-start" aria-labelledby="by-country">
          <div className="flex items-baseline justify-between">
            <h2 id="by-country" className="co-eyebrow">By country</h2>
            <span className="font-mono text-[10px] tracking-[0.1em] text-co-fg4">SORTED BY COINS</span>
          </div>
          <Card className="overflow-hidden">
            {rows.map((row, i) => (
              <button
                key={row.code}
                type="button"
                onClick={() => setPicked(row.code)}
                aria-pressed={picked === row.code}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-co-bg3',
                  i > 0 && 'border-t border-co-line2',
                  picked === row.code && 'bg-co-row-selected-bg'
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', picked === row.code ? 'bg-co-gold' : 'bg-co-fg4')} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[14px] text-co-fg">{row.name}</span>
                <span className="w-8 text-right font-mono text-[12px] text-co-fg">{row.coins}</span>
                <span className="w-12 text-right font-mono text-[11px] text-co-fg3">{row.earliest ?? '—'}</span>
              </button>
            ))}
            {state !== 'loading' && rows.length === 0 && (
              <p className="px-4 py-6 text-center text-[14px] text-co-fg3">
                No countries yet. Add coins with a country to fill in this map.
              </p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
