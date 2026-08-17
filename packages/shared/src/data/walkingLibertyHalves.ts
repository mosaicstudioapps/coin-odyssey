import type { CoinSeries } from '../types/series';
import { DateMintDef, buildDateMintDefs, toSpecificCoins, years } from './dateMintRuns';

// Walking Liberty half dollars, 1916-1947 — 63 date/mint combinations.
//
// The series ran in two blocks with a long gap: 1916-1921, then a scattering
// of San Francisco-only years (1923, 1927, 1928, 1933) plus 1929 D and S,
// then continuous production 1934-1947.
//
// Philadelphia: 1916-1921 and 1934-1947.
// Denver: the same, minus 1940, plus 1929.
// San Francisco: 1916-1921, 1923, 1927-1929, 1933, 1934-1937, 1939-1946.
//
// 63, not the 65 often quoted: the 1917-D and 1917-S obverse-vs-reverse
// mintmark positions are varieties, and this app does not slot varieties
// (same rule that excludes the 1955 doubled-die cent).
function buildWalkingLibertyHalves(): DateMintDef[] {
  return buildDateMintDefs('walking_liberty', [
    { mintMark: '', years: [...years(1916, 1921), ...years(1934, 1947)] },
    { mintMark: 'D', years: [...years(1916, 1921), 1929, ...years(1934, 1947, [1940])] },
    {
      mintMark: 'S',
      years: [
        ...years(1916, 1921),
        1923,
        ...years(1927, 1929),
        1933,
        ...years(1934, 1937),
        ...years(1939, 1946),
      ],
    },
  ]);
}

export const WALKING_LIBERTY_HALVES: DateMintDef[] = buildWalkingLibertyHalves();

export const WALKING_LIBERTY_SERIES: CoinSeries = {
  id: 'walking_liberty_halves',
  name: 'Walking Liberty Half Dollars',
  shortName: 'Walking Liberty',
  country: 'United States',
  denomination: 'Half Dollar',
  startYear: 1916,
  endYear: 1947,
  description: "Half dollars designed by Adolph A. Weinman, whose obverse was revived for the American Silver Eagle",
  category: 'circulating',
  mintMarks: ['', 'D', 'S'],
  specificCoins: toSpecificCoins(WALKING_LIBERTY_HALVES, 'Walking Liberty Half'),
};
