import type { CoinSeries } from '../types/series';
import { DateMintDef, annotateDefs, buildDateMintDefs, toSpecificCoins, years } from './dateMintRuns';

// Mercury (1916-1945) and Roosevelt (1946-) dimes.
//
// Verified 2026-10-24. Roosevelt: Wikipedia's "Roosevelt dime mintage figures"
// read as raw wikitext, row by row, with 2022-2025 cross-checked against
// CoinNews's reprints of the US Mint's production figures. Mercury: Wikipedia
// has no Mercury mintage table, so its runs come from the USA CoinBook and NGC
// price-guide listings, which agree on all 77, plus Wikipedia's text on what
// wasn't struck (no 1922, 1932, 1933; "1923-D" and "1930-D" are counterfeits).
// Business strikes only. Proofs, the 1996-W mint-set dime, 2017-S enhanced,
// 2005-2010 satin finishes, and varieties (1942/41, 1942/41-D) are left out.

// --- Mercury dimes: 77 business strikes ---
// Philadelphia: 1916-1945 except 1922, 1932, 1933.
// Denver: 1916-1921, 1924-1929, 1931, 1934-1945.
// San Francisco: 1916-1920, 1923-1931, 1935-1945.
function buildMercuryDimes(): DateMintDef[] {
  const defs = buildDateMintDefs('mercury', [
    { mintMark: '', years: years(1916, 1945, [1922, 1932, 1933]) },
    { mintMark: 'D', years: [...years(1916, 1921), ...years(1924, 1929), 1931, ...years(1934, 1945)] },
    { mintMark: 'S', years: [...years(1916, 1920), ...years(1923, 1931), ...years(1935, 1945)] },
  ]);
  // Barber dimes were also struck in 1916, at Philadelphia and San Francisco,
  // so a plain "1916 dime" mustn't fill these.
  return annotateDefs(defs, {
    mercury_1916: { keywords: ['mercury', 'winged liberty'] },
    mercury_1916_s: { keywords: ['mercury', 'winged liberty'] },
  });
}

// --- Roosevelt dimes: 167 business strikes, 1946-2025 ---
// Philadelphia: 1946-1979 with no mark (1965-1967 carry no mark at any mint
// and get one slot each), P from 1980. Denver: 1946-1964, 1968 on.
// San Francisco: 1946-1955 only.
// 2026 dimes are the one-year Semiquincentennial "Emerging Liberty" design,
// not Roosevelt dimes; the Roosevelt design is due back in 2027.
export const ROOSEVELT_CHECKED_THROUGH = 2025;

function buildRooseveltDimes(throughYear: number): DateMintDef[] {
  const defs = buildDateMintDefs('roosevelt', [
    { mintMark: '', years: years(1946, throughYear) },
    { mintMark: 'D', years: [...years(1946, 1964), ...years(1968, throughYear)] },
    { mintMark: 'S', years: years(1946, 1955) },
  ]);
  const annotations: Record<string, Partial<Omit<DateMintDef, 'id' | 'year' | 'mintMark'>>> = {};
  for (const year of [1965, 1966, 1967]) annotations[`roosevelt_${year}`] = { sublabel: 'No mint mark' };
  for (const year of years(1980, throughYear)) annotations[`roosevelt_${year}`] = { name: `${year}-P` };
  return annotateDefs(defs, annotations);
}

export const MERCURY_DIMES: DateMintDef[] = buildMercuryDimes();
export const ROOSEVELT_DIMES: DateMintDef[] = buildRooseveltDimes(ROOSEVELT_CHECKED_THROUGH);

export const DIME_SERIES: CoinSeries[] = [
  {
    id: 'mercury_dimes',
    name: 'Mercury Dimes',
    shortName: 'Mercury Dimes',
    country: 'United States',
    denomination: 'Dime',
    startYear: 1916,
    endYear: 1945,
    description: "Adolph A. Weinman's Winged Liberty Head dime, nicknamed for Mercury",
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: toSpecificCoins(MERCURY_DIMES, 'Mercury Dime'),
  },
  {
    id: 'roosevelt_dimes',
    name: 'Roosevelt Dimes',
    shortName: 'Roosevelt Dimes',
    country: 'United States',
    denomination: 'Dime',
    startYear: 1946,
    endYear: ROOSEVELT_CHECKED_THROUGH,
    description: 'Dimes honoring Franklin D. Roosevelt, introduced the year after his death',
    category: 'circulating',
    mintMarks: ['', 'P', 'D', 'S'],
    specificCoins: toSpecificCoins(ROOSEVELT_DIMES, 'Roosevelt Dime'),
  },
];
