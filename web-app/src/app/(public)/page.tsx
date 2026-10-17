// The landing page: what Coin Odyssey does, the stores, the web app, and the
// checklists (the part search engines can read).
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Globe2, ScanLine, ScrollText, Trophy } from 'lucide-react';
import { CoinDisc } from '@/components/co';
import { StoreBadges } from '@/components/public/StoreBadges';
import { listChecklists } from '@/lib/checklists';

export const metadata: Metadata = {
  title: { absolute: 'Coin Odyssey · Identify, learn about, and catalog your coins' },
  description:
    'Photograph a coin and Coin Odyssey identifies it, estimates its grade, and tells you its story. Fill series albums, earn badges, and map your collection. On iPhone, Android, and the web.',
  alternates: { canonical: '/' },
};

const FEATURES = [
  {
    icon: ScanLine,
    title: 'Scan to identify',
    body: 'Photograph both sides. Coin Odyssey reads the country, year, denomination, and mint mark, and estimates the grade.',
  },
  {
    icon: ScrollText,
    title: 'Learn its story',
    body: 'Every coin comes with a short history: who designed it, why it changed, and what to look for.',
  },
  {
    icon: BookOpen,
    title: 'Fill your albums',
    body: 'Digital folders for state quarters, Lincoln cents, Morgan dollars, and more. Scanned coins drop into their slots.',
  },
  {
    icon: Trophy,
    title: 'Earn badges',
    body: 'Milestones for your first coin, a finished album, a century of history, and the countries you reach.',
  },
  {
    icon: Globe2,
    title: 'Map your collection',
    body: 'See every country your coins come from, and the years of history they span.',
  },
];

export default function Home() {
  const checklists = listChecklists();
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-24">
        <div className="flex flex-col gap-6">
          <p className="co-eyebrow">For coin collectors</p>
          <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-co-fg md:text-[60px]">
            Photograph a coin. Learn its story. Catalog your collection.
          </h1>
          <p className="max-w-xl text-[17px] leading-relaxed text-co-fg2">
            Coin Odyssey identifies your coins from a photo, tells you where they came from, and keeps your collection in order.
            It&apos;s about the history, so there are no prices and no valuations.
          </p>
          <StoreBadges />
          <p className="text-[14px] text-co-fg3">
            On a computer?{' '}
            <Link href="/auth/signup" className="text-co-gold-text hover:underline">
              Use it on the web
            </Link>
            , with the same account and the same collection.
          </p>
        </div>
        <div className="relative hidden h-[360px] lg:block" aria-hidden>
          <div className="absolute left-6 top-4">
            <CoinDisc size={220} tone="silver" label="1964" />
          </div>
          <div className="absolute bottom-2 right-4">
            <CoinDisc size={170} tone="gold" label="1921" />
          </div>
          <div className="absolute bottom-24 left-0">
            <CoinDisc size={110} tone="copper" label="1909" />
          </div>
        </div>
      </section>

      <section className="border-y border-co-line bg-co-bg2" aria-labelledby="features">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <h2 id="features" className="sr-only">
            What Coin Odyssey does
          </h2>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex flex-col gap-2">
                <Icon className="h-5 w-5 text-co-gold-text" aria-hidden />
                <h3 className="font-display text-[19px] text-co-fg">{title}</h3>
                <p className="text-[14px] leading-relaxed text-co-fg2">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8" aria-labelledby="checklists">
        <div className="mb-8 flex flex-col gap-2">
          <p className="co-eyebrow">Free and printable</p>
          <h2 id="checklists" className="font-display text-[32px] tracking-[-0.02em] text-co-fg">
            Coin checklists
          </h2>
          <p className="max-w-prose text-[15px] text-co-fg2">
            Every date, mint mark, and design in the series collectors love most. Print one, or track it in the app.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map(c => (
            <li key={c.slug}>
              <Link
                href={`/checklists/${c.slug}`}
                className="flex h-full items-center gap-4 rounded-md border border-co-line bg-co-bg2 p-4 transition hover:border-co-fg4"
              >
                <CoinDisc size={44} tone={c.album.discTone} label={c.album.title.slice(0, 2)} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-[17px] text-co-fg">{c.album.title}</span>
                  <span className="block font-mono text-[10px] tracking-[0.1em] text-co-fg3">
                    {c.album.subtitle} · {c.album.totalSlots} COINS
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
