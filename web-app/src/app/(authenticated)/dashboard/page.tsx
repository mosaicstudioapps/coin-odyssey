'use client';

// The dashboard: the same cards as the mobile one (years of history, growth,
// counts, coverage, achievements, scan, recently added), in two columns.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ScanLine } from 'lucide-react';
import {
  buildMonthlySeries,
  coinLabel,
  collectedCountryCodes,
  computeDelta,
  computeMonthTicks,
  computeYearSpan,
  metalDiscTone,
  nextBadge,
  recentBadges,
  recentCoins,
  WORLD_COUNTRY_TOTAL,
} from '@coin-collecting/shared';
import { AchievementBadge, Card, CoinDisc, Eyebrow, MiniChart, ProgressBar, Stat, WorldMap } from '@/components/co';
import { useAchievements } from '@/lib/achievements';
import { useCurrency } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { useCoins } from '@/lib/useCoins';

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const cardLink = 'block rounded-md transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-co-gold';

export default function DashboardPage() {
  const { coins, state } = useCoins();
  const { format } = useCurrency();
  const { snapshot: achievements } = useAchievements();
  const [firstName, setFirstName] = useState<string | null>(null);
  const monthTicks = useMemo(() => computeMonthTicks(), []);

  useEffect(() => {
    // No fallback to the email: the greeting is decorative, and an email on
    // the first screen is in every screenshot. Same rule as mobile.
    void supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.firstName;
      setFirstName(typeof name === 'string' && name.trim() ? name.trim() : null);
    });
  }, []);

  const stats = useMemo(() => {
    const codes = collectedCountryCodes(coins);
    const series = buildMonthlySeries(coins);
    return {
      span: computeYearSpan(coins),
      codes,
      recent: recentCoins(coins, 5),
      series,
      hasSeries: series.some(v => v > 0),
    };
  }, [coins]);

  const username = firstName || 'Collector';
  const { span } = stats;
  const delta = stats.hasSeries ? computeDelta(stats.series) : null;
  const next = achievements ? nextBadge(achievements.achievements) : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting and the collection's stretch of history */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-co-gold font-display text-[15px] text-co-gold-fg">
              {username[0]?.toUpperCase()}
            </span>
            <div>
              <p className="font-mono text-[11px] tracking-[0.04em] text-co-fg3">WELCOME BACK</p>
              <p className="text-[13px] text-co-fg">{username}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Eyebrow>Years of history</Eyebrow>
            <p className="font-display text-[64px] leading-none tracking-[-0.03em] text-co-fg">
              {state === 'loading' ? '—' : span ? span.years : '—'}
            </p>
            {span && (
              <p className="font-mono text-[12px] tracking-[0.06em] text-co-fg3">
                {span.min === span.max ? span.min : `${span.min} — ${span.max}`}
              </p>
            )}
            {delta && delta.abs !== 0 && (
              <p className={`font-mono text-[11px] tracking-[0.06em] ${delta.abs < 0 ? 'text-co-c-low' : 'text-co-c-high'}`}>
                {delta.abs >= 0 ? '▲' : '▼'} {Math.abs(delta.abs)} {Math.abs(delta.abs) === 1 ? 'COIN' : 'COINS'}
                <span className="text-co-fg3"> · 12 MONTHS</span>
              </p>
            )}
          </div>
        </div>
        <Link
          href="/scan"
          className="flex min-w-[18rem] items-center gap-4 rounded-md border border-co-gold-dim bg-gradient-to-br from-co-cta-top-warm to-co-cta-bot-warm p-4 transition hover:brightness-105"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-co-gold">
            <ScanLine className="h-6 w-6 text-co-gold-fg" strokeWidth={1.8} aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-display text-[19px] text-co-fg">Scan a coin</span>
            <span className="block text-[13px] text-co-fg2">Identify, grade &amp; catalog in seconds</span>
          </span>
          <ArrowRight className="h-[18px] w-[18px] text-co-gold-text" aria-hidden />
        </Link>
      </header>

      {state === 'error' && (
        <p role="alert" className="rounded-sm border border-co-warn-border bg-co-warn-bg px-3 py-2 text-[13px] text-co-fg">
          Could not load your collection. Check your connection; this page refreshes when it&apos;s back.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Growth */}
          <Card className="p-5 pb-3">
            <div className="mb-2 flex items-baseline justify-between">
              <Eyebrow>Collection growth · last 12 months</Eyebrow>
              <span className="font-mono text-[10px] tracking-[0.1em] text-co-fg3">COINS</span>
            </div>
            {stats.hasSeries ? (
              <>
                <MiniChart data={stats.series} width={640} height={140} />
                <div className="mt-1 flex justify-between">
                  {monthTicks.map((m, i) => (
                    <span key={`${m}-${i}`} className="font-mono text-[9.5px] tracking-[0.06em] text-co-fg4">
                      {m}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-[14px] text-co-fg3">Your collection&apos;s growth will chart here as you add coins.</p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Stat eyebrow="COINS" value={String(coins.length)} />
            <Stat eyebrow="COUNTRIES" value={String(stats.codes.length)} />
          </div>

          {/* Coverage */}
          <Link href="/map" className={cardLink}>
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <Eyebrow>Coverage</Eyebrow>
                <span className="font-mono text-[11px] text-co-fg2">
                  {stats.codes.length} / {WORLD_COUNTRY_TOTAL}
                </span>
              </div>
              <WorldMap collected={stats.codes} className="my-3" />
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-co-fg3">
                <span>
                  <span className="text-co-gold">●</span> COLLECTED · <span className="text-co-fg4">●</span> UNCOLLECTED
                </span>
                <span className="text-co-gold-text">EXPLORE →</span>
              </div>
            </Card>
          </Link>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Achievements */}
          {achievements && (
            <Link
              href="/achievements"
              className={cardLink}
              aria-label={`Achievements, ${achievements.earnedCount} of ${achievements.achievements.length} earned`}
            >
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-baseline justify-between">
                  <Eyebrow>Achievements</Eyebrow>
                  <span className="font-mono text-[11px] text-co-fg2">
                    {achievements.earnedCount} / {achievements.achievements.length}
                  </span>
                </div>
                {achievements.earnedCount > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {recentBadges(achievements.achievements, 6).map(a => (
                      <AchievementBadge key={a.id} achievement={a} earned size={42} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-co-fg3">Add a coin to earn your first badge.</p>
                )}
                {next && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between gap-3 font-mono text-[10px] tracking-[0.08em]">
                      <span className="truncate text-co-fg2">NEXT · {next.title.toUpperCase()}</span>
                      <span className="text-co-fg3">
                        {next.current} / {next.required}
                      </span>
                    </div>
                    <ProgressBar value={next.current / next.required} height={3} label={`Progress toward ${next.title}`} />
                  </div>
                )}
                <span className="self-end font-mono text-[10px] tracking-[0.1em] text-co-gold-text">VIEW ALL →</span>
              </Card>
            </Link>
          )}

          {/* Recently added */}
          <section className="flex flex-col gap-2" aria-labelledby="recent">
            <div className="flex items-baseline justify-between">
              <h2 id="recent" className="co-eyebrow">Recently added</h2>
              <Link href="/collection" className="font-mono text-[10px] tracking-[0.1em] text-co-gold-text hover:underline">
                VIEW ALL →
              </Link>
            </div>
            <Card className="overflow-hidden">
              {stats.recent.map((coin, i) => (
                <Link
                  key={coin.id}
                  href={`/collection/${coin.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-co-bg3 ${i > 0 ? 'border-t border-co-line2' : ''}`}
                >
                  <CoinDisc size={42} label={String(coin.year).slice(-2)} tone={metalDiscTone(coin)} imageSrc={coin.obverseImage || undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] text-co-fg">{coinLabel(coin)}</span>
                      <span className="font-mono text-[11px] text-co-fg3">{coin.year}</span>
                    </span>
                    <span className="block truncate font-mono text-[10px] tracking-[0.06em] text-co-fg3">
                      {coin.country || '—'} · {coin.grade || '—'}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    {coin.purchasePrice != null && <span className="font-mono text-[12px] text-co-fg2">{format(coin.purchasePrice)}</span>}
                    <span className="font-mono text-[10px] text-co-fg4">{formatRelative(coin.createdAt)}</span>
                  </span>
                </Link>
              ))}
              {state !== 'loading' && stats.recent.length === 0 && (
                <p className="px-4 py-6 text-center text-[14px] text-co-fg3">
                  No coins yet.{' '}
                  <Link href="/scan" className="text-co-gold-text hover:underline">
                    Scan your first
                  </Link>
                  .
                </p>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
