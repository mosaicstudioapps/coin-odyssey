import type { CoinSeries, SpecificCoin } from '../types/series';

// Lincoln cents in three volume albums (mirroring the physical Whitman
// folders): Wheat 1909-1958, Memorial 1959-2008, Shield/Modern 2009-present.
// Slots are generated from compact exception tables rather than hand-typed;
// tests pin the resulting counts (140 / 104 / 42 as of 2026).
//
// Deliberately excluded: variety slots (1955 DDO, 1922 plain, 1982 varieties,
// steel-vs-bronze) — circulation date/mint runs only.

export interface LincolnCentDef {
  id: string;
  /** Slot label, e.g. "1909-S V.D.B.", "1958-D", "2017 P". */
  name: string;
  year: number;
  /** '' = Philadelphia (no mark). */
  mintMark: '' | 'D' | 'S';
  /** Normalized substrings required for a heuristic match (design-gated slots). */
  keywords?: string[];
  /** Normalized substrings that must NOT appear (e.g. plain 1909 excludes "vdb"). */
  excludeKeywords?: string[];
}

function range(start: number, end: number): number[] {
  const years: number[] = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years;
}

function centId(year: number, mintMark: string, suffix?: string): string {
  return `lincoln_${year}${mintMark ? `_${mintMark.toLowerCase()}` : ''}${suffix ? `_${suffix}` : ''}`;
}

function centName(year: number, mintMark: string): string {
  return mintMark ? `${year}-${mintMark}` : `${year}`;
}

function cent(year: number, mintMark: '' | 'D' | 'S'): LincolnCentDef {
  return { id: centId(year, mintMark), name: centName(year, mintMark), year, mintMark };
}

/** Sort by year, then mint order '' < D < S, so decade sections read naturally. */
const MINT_ORDER: Record<string, number> = { '': 0, D: 1, S: 2 };
function byYearThenMint(a: LincolnCentDef, b: LincolnCentDef): number {
  return a.year - b.year || MINT_ORDER[a.mintMark] - MINT_ORDER[b.mintMark];
}

// --- Wheat reverse, 1909-1958 (140 slots) ---
// No-mark: every year except 1922 (Denver-only year).
// D: 1911-1958 except 1921 and 1923.
// S: 1909-1921, 1923-1931, 1935-1955.
// 1909 and 1909-S each split into V.D.B. and plain slots.
function buildWheatCents(): LincolnCentDef[] {
  const slots: LincolnCentDef[] = [];

  for (const year of range(1909, 1958)) {
    if (year !== 1922) slots.push(cent(year, ''));
  }
  for (const year of range(1911, 1958)) {
    if (year !== 1921 && year !== 1923) slots.push(cent(year, 'D'));
  }
  const sYears = [...range(1909, 1921), ...range(1923, 1931), ...range(1935, 1955)];
  for (const year of sYears) {
    slots.push(cent(year, 'S'));
  }

  // Split the 1909 issues into V.D.B. / plain.
  const split = (mintMark: '' | 'S'): LincolnCentDef[] => [
    {
      id: centId(1909, mintMark, 'vdb'),
      name: `${centName(1909, mintMark)} V.D.B.`,
      year: 1909,
      mintMark,
      keywords: ['vdb'],
    },
    { ...cent(1909, mintMark), excludeKeywords: ['vdb'] },
  ];
  const withSplits = slots.flatMap(slot =>
    slot.year === 1909 && slot.mintMark !== 'D' ? split(slot.mintMark as '' | 'S') : [slot],
  );

  return withSplits.sort(byYearThenMint);
}

// --- Memorial reverse, 1959-2008 (104 slots) ---
// No-mark: 1959-2008. D: 1959-2008 except 1965-1967 (no mint marks used).
// S circulation strikes: 1968-1974 only (S was proof-only afterward).
function buildMemorialCents(): LincolnCentDef[] {
  const slots: LincolnCentDef[] = [];

  for (const year of range(1959, 2008)) {
    slots.push(cent(year, ''));
    if (year < 1965 || year > 1967) slots.push(cent(year, 'D'));
  }
  for (const year of range(1968, 1974)) {
    slots.push(cent(year, 'S'));
  }

  return slots.sort(byYearThenMint);
}

// --- Shield / Modern, 2009-present ---
// 2009 Lincoln Bicentennial: four reverse designs x (no-mark, D) = 8
// keyword-gated slots. 2010 onward: Union Shield reverse, no-mark + D.
// The 2017 Philadelphia issue carried a P mint mark (225th anniversary) —
// labeled "2017 P" but matched as no-mark since P folds to ''.
export const BICENTENNIAL_2009_DESIGNS: Array<{
  key: string;
  title: string;
  keywords: string[];
}> = [
  { key: 'birth', title: 'Birth and Early Childhood', keywords: ['birth', 'log cabin', 'early childhood', 'kentucky'] },
  { key: 'formative', title: 'Formative Years', keywords: ['formative', 'rail splitter', 'indiana'] },
  { key: 'professional', title: 'Professional Life', keywords: ['professional', 'springfield', 'illinois'] },
  { key: 'presidency', title: 'Presidency', keywords: ['presidency', 'capitol'] },
];

export function buildShieldCents(currentYear: number): LincolnCentDef[] {
  const slots: LincolnCentDef[] = [];

  for (const design of BICENTENNIAL_2009_DESIGNS) {
    for (const mintMark of ['', 'D'] as const) {
      slots.push({
        id: centId(2009, mintMark, design.key),
        name: `${centName(2009, mintMark)} ${design.title}`,
        year: 2009,
        mintMark,
        keywords: design.keywords,
      });
    }
  }
  for (const year of range(2010, currentYear)) {
    const noMark = cent(year, '');
    if (year === 2017) noMark.name = '2017 P';
    slots.push(noMark, cent(year, 'D'));
  }

  return slots;
}

export const LINCOLN_WHEAT_CENTS: LincolnCentDef[] = buildWheatCents();
export const LINCOLN_MEMORIAL_CENTS: LincolnCentDef[] = buildMemorialCents();
export const LINCOLN_SHIELD_CENTS: LincolnCentDef[] = buildShieldCents(new Date().getFullYear());

// --- CoinSeries registration (so assignment can write series_id + name) ---
const toSpecificCoin = (def: LincolnCentDef): SpecificCoin => ({
  id: def.id,
  name: `${def.name} Lincoln Cent`,
  year: def.year,
  mintMark: def.mintMark || undefined,
});

export const LINCOLN_CENT_SERIES: CoinSeries[] = [
  {
    id: 'lincoln_wheat_cents',
    name: 'Lincoln Wheat Cents',
    shortName: 'Wheat Cents',
    country: 'United States',
    denomination: 'Cent',
    startYear: 1909,
    endYear: 1958,
    description: 'Lincoln cents with the wheat-ears reverse, designed by Victor David Brenner',
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: LINCOLN_WHEAT_CENTS.map(toSpecificCoin),
  },
  {
    id: 'lincoln_memorial_cents',
    name: 'Lincoln Memorial Cents',
    shortName: 'Memorial Cents',
    country: 'United States',
    denomination: 'Cent',
    startYear: 1959,
    endYear: 2008,
    description: 'Lincoln cents with the Lincoln Memorial reverse by Frank Gasparro',
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: LINCOLN_MEMORIAL_CENTS.map(toSpecificCoin),
  },
  {
    id: 'lincoln_shield_cents',
    name: 'Lincoln Shield Cents',
    shortName: 'Shield Cents',
    country: 'United States',
    denomination: 'Cent',
    startYear: 2009,
    endYear: new Date().getFullYear(),
    description: '2009 Bicentennial reverses and the Union Shield reverse from 2010 onward',
    category: 'circulating',
    mintMarks: ['', 'D'],
    specificCoins: LINCOLN_SHIELD_CENTS.map(toSpecificCoin),
  },
];
