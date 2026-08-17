import type { CoinSeries } from '../types/series';
import {
  DateMintDef,
  annotateDefs,
  buildDateMintDefs,
  toSpecificCoins,
  years,
} from './dateMintRuns';

// Morgan (1878-1904, 1921) and Peace (1921-1935) silver dollars. Kept in one
// module because they overlap: both are $1, and both were struck in 1921, so
// the 1921 Philadelphia slots have to be gated against each other or a single
// coin would silently fill a slot in both albums.
//
// Modern 2021+ Morgan/Peace reissues are out of scope — the year gate keeps
// them from touching these slots.
//
// Verified 2026-08-16 against the per-mint mintage tables in the Wikipedia
// Morgan dollar and Peace dollar articles (sourced to Breen 1988), read as raw
// wikitext so blank cells stay blank. Every mint-run boundary below
// corresponds to an empty cell in those tables. Note that a summarised read of
// those tables silently invents an 1878-O, a 1921-O and a 1928-D by shifting
// columns across the blanks — if re-checking, read the rows directly.

// --- Morgan dollars: 96 business-strike date/mint combinations ---
// Philadelphia (no mark): 1878-1904, 1921.
// Carson City: 1878-1885 and 1889-1893 (shut 1886-1888, closed after 1893).
// New Orleans: 1879-1904 (no 1878-O).
// San Francisco: 1878-1904, 1921.
// Denver: 1921 only.
function buildMorganDollars(): DateMintDef[] {
  const defs = buildDateMintDefs('morgan', [
    { mintMark: '', years: [...years(1878, 1904), 1921] },
    { mintMark: 'CC', years: [...years(1878, 1885), ...years(1889, 1893)] },
    { mintMark: 'O', years: years(1879, 1904) },
    { mintMark: 'S', years: [...years(1878, 1904), 1921] },
    { mintMark: 'D', years: [1921] },
  ]);

  return annotateDefs(defs, {
    // 1895 Philadelphia is proof-only, but it has a hole in every Morgan
    // folder ("King of Morgans"), so it keeps a slot with the caveat shown.
    morgan_1895: { sublabel: 'Proof only' },
    // Shares 1921 + no mint mark with the Peace dollar slot. Requires positive
    // evidence; a generic "1921 Silver Dollar" fills neither and stays manual.
    morgan_1921: { keywords: ['morgan'] },
  });
}

// --- Peace dollars: 24 date/mint combinations ---
// Struck 1921-1928 and 1934-1935. Denver skipped 1921, 1924, 1925, 1928 and
// 1935; San Francisco struck every year of the series.
function buildPeaceDollars(): DateMintDef[] {
  const defs = buildDateMintDefs('peace', [
    { mintMark: '', years: [...years(1921, 1928), ...years(1934, 1935)] },
    { mintMark: 'D', years: [1922, 1923, 1926, 1927, 1934] },
    { mintMark: 'S', years: [...years(1922, 1928), ...years(1934, 1935)] },
  ]);

  return annotateDefs(defs, {
    // 1921 is the high-relief first-year issue, and the only Peace slot that
    // collides with a Morgan slot. See morgan_1921 above.
    peace_1921: { sublabel: 'High relief', keywords: ['peace', 'high relief'] },
  });
}

export const MORGAN_DOLLARS: DateMintDef[] = buildMorganDollars();
export const PEACE_DOLLARS: DateMintDef[] = buildPeaceDollars();

export const SILVER_DOLLAR_SERIES: CoinSeries[] = [
  {
    id: 'morgan_dollars',
    name: 'Morgan Silver Dollars',
    shortName: 'Morgan Dollars',
    country: 'United States',
    denomination: 'Dollar',
    startYear: 1878,
    endYear: 1921,
    description: 'Silver dollars designed by George T. Morgan, struck 1878-1904 and again in 1921',
    category: 'circulating',
    mintMarks: ['', 'CC', 'D', 'O', 'S'],
    specificCoins: toSpecificCoins(MORGAN_DOLLARS, 'Morgan Dollar'),
  },
  {
    id: 'peace_dollars',
    name: 'Peace Silver Dollars',
    shortName: 'Peace Dollars',
    country: 'United States',
    denomination: 'Dollar',
    startYear: 1921,
    endYear: 1935,
    description: "Silver dollars designed by Anthony de Francisci to commemorate peace after World War I",
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: toSpecificCoins(PEACE_DOLLARS, 'Peace Dollar'),
  },
];
