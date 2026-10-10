import { notFound } from 'next/navigation';
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, ACHIEVEMENT_GROUP_TITLES, darkPalette } from '@coin-collecting/shared';
import { cssVarName } from '@/theme/themeCss';
import {
  AchievementBadge,
  Card,
  CoinDisc,
  ConfBadge,
  Eyebrow,
  MiniChart,
  ProgressBar,
  Stat,
  ThemeChoice,
} from '@/components/co';
import { FormSamples } from './FormSamples';

export const metadata = { title: 'Design system · Coin Odyssey', robots: { index: false } };

// A working sheet of every web component, for checking both themes by eye.
// Development only: production builds return 404.
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const tokens = Object.keys(darkPalette);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Coin Odyssey web · design system</Eyebrow>
          <h1 className="font-display text-[34px] leading-tight tracking-[-0.02em]">Components in this theme</h1>
          <p className="max-w-prose text-co-fg2">
            Switch themes to check every piece in both. Colors come from the shared palettes, the same values as the
            mobile app.
          </p>
        </div>
        <ThemeChoice />
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="type">
        <h2 id="type" className="co-eyebrow">Type</h2>
        <Card className="flex flex-col gap-3 p-6">
          <p className="font-display text-[44px] leading-none tracking-[-0.02em]">155</p>
          <p className="font-mono text-xs tracking-[0.1em] text-co-fg3">1870 — 2024</p>
          <p className="font-display text-[26px] tracking-[-0.01em]">50 State Quarters</p>
          <p className="text-[15px] text-co-fg">Body text in DM Sans, the face the app uses for reading.</p>
          <p className="text-[13px] text-co-fg2">Secondary text for supporting details.</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-co-gold-text">View all →</p>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="discs">
        <h2 id="discs" className="co-eyebrow">Coin discs and badges</h2>
        <Card className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <CoinDisc tone="gold" label="21" size={64} />
            <CoinDisc tone="silver" label="64" size={64} />
            <CoinDisc tone="copper" label="09" size={64} />
            <CoinDisc tone="gold" label="OBV" size={42} />
          </div>
          {ACHIEVEMENT_GROUPS.map(group => (
            <div key={group} className="flex flex-col gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg3">{ACHIEVEMENT_GROUP_TITLES[group]}</p>
              <div className="flex flex-wrap gap-3">
                {ACHIEVEMENTS.filter(a => a.group === group).map((a, i) => (
                  <AchievementBadge key={a.id} achievement={a} earned={i % 2 === 0} size={44} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[13px] text-co-fg3">Every other badge is shown not yet earned.</p>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="data">
        <h2 id="data" className="co-eyebrow">Stats, confidence, progress, chart</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat eyebrow="Coins" value="117" />
          <Stat eyebrow="Countries" value="33" delta="2 this month" />
          <Stat eyebrow="Scans left" value="18" suffix="/ 25" delta="7 used" deltaDir="down" />
        </div>
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            <ConfBadge level="h" />
            <ConfBadge level="m" score={0.62} />
            <ConfBadge level="l" />
            <ConfBadge level="n" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between font-mono text-[10px] tracking-[0.08em] text-co-fg2">
              <span>NEXT · GLOBETROTTER</span>
              <span>7 / 10</span>
            </div>
            <ProgressBar value={0.7} height={3} label="Globetrotter progress" />
          </div>
          <MiniChart data={[12, 14, 15, 15, 19, 24, 26, 31, 33, 38, 41, 47]} />
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="forms">
        <h2 id="forms" className="co-eyebrow">Forms and buttons</h2>
        <FormSamples />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="tokens">
        <h2 id="tokens" className="co-eyebrow">Every token</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {tokens.map(token => (
            <div key={token} className="flex min-w-0 items-center gap-2 rounded-sm border border-co-line bg-co-bg2 p-2">
              <span className="h-7 w-7 shrink-0 rounded-[6px] border border-co-line" style={{ background: `var(${cssVarName(token)})` }} />
              <code className="truncate font-mono text-[11px] text-co-fg2">{token}</code>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
