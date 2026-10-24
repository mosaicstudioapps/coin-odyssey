import type { CoinSeries } from '../types/series';
import { DateMintDef, annotateDefs, buildDateMintDefs, toSpecificCoins, years } from './dateMintRuns';

// Kennedy half dollars, 1964-2025.
//
// Verified 2026-10-24 against Wikipedia's "Kennedy half dollar mintage
// figures" read as raw wikitext, row by row, with 2020-2024 checked against
// archived copies of the US Mint's circulating-production pages.
// Business strikes, including those released only to collectors, since
// folders have holes for them. Proofs, the 1965-1967 Special Mint Sets, the
// 40% silver 1976-S, the 2014 anniversary and enhanced/reverse-proof issues,
// and varieties are left out.

// --- 116 business strikes ---
// Philadelphia: 1964, 1965-1967 (no mark at any mint; one slot each),
//   1971-1974, 1976, 1977-1979 with no mark; P from 1980. None 1968-1970.
// Denver: 1964, 1968-1974, 1976, 1977 on. None 1965-1967.
// None dated 1975: those struck that year carry the 1776-1976 dual date.
// 1964 is 90% silver; 1965-1970 40% silver; clad from 1971.
// The 2026 half dollar is the Semiquincentennial design, not a Kennedy.
export const KENNEDY_CHECKED_THROUGH = 2025;

function buildKennedyHalves(throughYear: number): DateMintDef[] {
  const defs = buildDateMintDefs('kennedy', [
    { mintMark: '', years: [...years(1964, 1967), ...years(1971, 1974), ...years(1976, throughYear)] },
    { mintMark: 'D', years: [1964, ...years(1968, 1974), ...years(1976, throughYear)] },
  ]);
  const annotations: Record<string, Partial<Omit<DateMintDef, 'id' | 'year' | 'mintMark'>>> = {
    kennedy_1964: { sublabel: '90% silver' },
    kennedy_1964_d: { sublabel: '90% silver' },
    kennedy_1970_d: { sublabel: 'Mint sets only' },
    kennedy_1976: { sublabel: '1776–1976' },
    kennedy_1976_d: { sublabel: '1776–1976' },
    kennedy_1987: { name: '1987-P', sublabel: 'Mint sets only' },
    kennedy_1987_d: { sublabel: 'Mint sets only' },
  };
  for (const year of [1965, 1966, 1967]) annotations[`kennedy_${year}`] = { sublabel: 'No mint mark' };
  for (const year of [1968, 1969]) annotations[`kennedy_${year}_d`] = { sublabel: '40% silver' };
  for (const year of years(1980, throughYear)) {
    if (year === 1987) continue;
    // 2002-2020 halves were made for collectors (rolls, bags, mint sets) only.
    const collector = year >= 2002 && year <= 2020 ? { sublabel: 'Not for circulation' } : {};
    annotations[`kennedy_${year}`] = { name: `${year}-P`, ...collector };
    if (year >= 2002 && year <= 2020) annotations[`kennedy_${year}_d`] = collector;
  }
  return annotateDefs(defs, annotations);
}

export const KENNEDY_HALVES: DateMintDef[] = buildKennedyHalves(KENNEDY_CHECKED_THROUGH);

export const KENNEDY_HALF_SERIES: CoinSeries = {
  id: 'kennedy_halves',
  name: 'Kennedy Half Dollars',
  shortName: 'Kennedy Halves',
  country: 'United States',
  denomination: 'Half Dollar',
  startYear: 1964,
  endYear: KENNEDY_CHECKED_THROUGH,
  description: 'Half dollars honoring John F. Kennedy, first struck months after his death',
  category: 'circulating',
  mintMarks: ['', 'P', 'D'],
  specificCoins: toSpecificCoins(KENNEDY_HALVES, 'Kennedy Half Dollar'),
};
