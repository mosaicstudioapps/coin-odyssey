import type { CoinSeries } from '../types/series';
import { DateMintDef, annotateDefs, buildDateMintDefs, toSpecificCoins, years } from './dateMintRuns';

// Washington quarters, 1932-1998: the series before the State Quarters, in
// silver through 1964 and copper-nickel clad from 1965.
//
// Verified 2026-10-24 against Wikipedia's "Washington quarter mintage figures"
// read as raw wikitext, row by row, cross-checked with the NGC price guide.
// Business strikes only. Proofs, the 1965-1967 Special Mint Sets, the 40%
// silver 1976-S sold in collector sets, and varieties (1934 doubled die,
// 1937 and 1942-D doubled dies, 1950-D/S, 1950-S/D) are left out. West Point
// struck unmarked quarters in 1977-1979 that can't be told from Philadelphia's.

// --- 146 business strikes ---
// None dated 1933, and none dated 1975: quarters struck that year carry the
// 1776-1976 bicentennial dual date and are listed as 1976.
// Philadelphia: 1932, 1934-1979 with no mark (1965-1967 carry no mark at any
//   mint and get one slot each), P from 1980.
// Denver: 1932, 1934-1937, 1939-1964, 1968-1974, 1976-1998 (no 1938-D).
// San Francisco: 1932, 1935-1948, 1950-1954.
function buildWashingtonQuarters(): DateMintDef[] {
  const defs = buildDateMintDefs('washington', [
    { mintMark: '', years: [1932, ...years(1934, 1998, [1975])] },
    {
      mintMark: 'D',
      years: [1932, ...years(1934, 1937), ...years(1939, 1964), ...years(1968, 1974), ...years(1976, 1998)],
    },
    { mintMark: 'S', years: [1932, ...years(1935, 1948), ...years(1950, 1954)] },
  ]);
  const annotations: Record<string, Partial<Omit<DateMintDef, 'id' | 'year' | 'mintMark'>>> = {
    washington_1976: { sublabel: '1776–1976' },
    washington_1976_d: { sublabel: '1776–1976' },
  };
  for (const year of [1965, 1966, 1967]) annotations[`washington_${year}`] = { sublabel: 'No mint mark' };
  for (const year of years(1980, 1998)) annotations[`washington_${year}`] = { name: `${year}-P` };
  return annotateDefs(defs, annotations);
}

export const WASHINGTON_QUARTERS: DateMintDef[] = buildWashingtonQuarters();

export const WASHINGTON_QUARTER_SERIES: CoinSeries = {
  id: 'washington_quarters',
  name: 'Washington Quarters',
  shortName: 'Washington Quarters',
  country: 'United States',
  denomination: 'Quarter',
  startYear: 1932,
  endYear: 1998,
  description: "John Flanagan's Washington quarter, first struck for the bicentennial of Washington's birth",
  category: 'circulating',
  mintMarks: ['', 'P', 'D', 'S'],
  specificCoins: toSpecificCoins(WASHINGTON_QUARTERS, 'Washington Quarter'),
};
