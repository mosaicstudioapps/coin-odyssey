import type { CoinSeries } from '../types/series';
import { DateMintDef, buildDateMintDefs, byYearThenMint, toSpecificCoins, years } from './dateMintRuns';
import { normalizeText } from '../utils/normalize';

// Sacagawea (2000-2008) and Native American (2009-) dollars, P and D every
// year. Since 2009 the reverse changes every year; that theme is the slot's
// second line.
//
// Verified 2026-10-24 against Wikipedia's "Sacagawea dollar" mintage and
// designs-by-year tables (raw wikitext), CoinNews (2026 issue on sale
// 2026-01-27, P and D), and archived US Mint production pages for 2020-2024.
// Business strikes only: proofs (S), enhanced-uncirculated issues, gold
// pieces, and varieties (2000-P "Cheerios", the Sacagawea/quarter mule) are
// left out. Most years were made only for collectors (rolls, bags, sets).
export const NATIVE_AMERICAN_CHECKED_THROUGH = 2026;

const THEMES: Record<number, string> = {
  2009: 'Three Sisters',
  2010: 'Great Law of Peace',
  2011: 'Wampanoag Treaty',
  2012: 'Trade Routes',
  2013: 'Treaty with the Delawares',
  2014: 'Native Hospitality',
  2015: 'Mohawk Ironworkers',
  2016: 'Code Talkers',
  2017: 'Sequoyah',
  2018: 'Jim Thorpe',
  2019: 'Indians in Space',
  2020: 'Elizabeth Peratrovich',
  2021: 'Indians in the Military',
  2022: 'Ely S. Parker',
  2023: 'Maria Tallchief',
  2024: 'Indian Citizenship Act',
  2025: 'Mary Kawena Pukui',
  2026: 'Oneida Allies',
};

function buildNativeAmericanDollars(throughYear: number): DateMintDef[] {
  return buildDateMintDefs('sacagawea', [
    { mintMark: 'P', years: years(2000, throughYear) },
    { mintMark: 'D', years: years(2000, throughYear) },
  ]).map(def => {
    const theme = THEMES[def.year];
    return {
      ...def,
      // The Presidential dollars share many of these years and the same
      // denomination, so a slot here needs the series (or the year's theme) named.
      keywords: ['sacagawea', 'native american', ...(theme ? [normalizeText(theme)] : [])],
      ...(theme ? { sublabel: theme } : {}),
    };
  });
}

// buildDateMintDefs gives 'P' its own id and mark; the albums fold P to '',
// so the match uses '' while the id and label keep the P.
export const NATIVE_AMERICAN_DOLLARS: DateMintDef[] = buildNativeAmericanDollars(NATIVE_AMERICAN_CHECKED_THROUGH)
  .map(def => (def.mintMark === 'P' ? { ...def, mintMark: '' } : def))
  .sort(byYearThenMint);

export const NATIVE_AMERICAN_DOLLAR_SERIES: CoinSeries = {
  id: 'native_american_dollars',
  name: 'Sacagawea and Native American Dollars',
  shortName: 'Native American Dollars',
  country: 'United States',
  denomination: 'Dollar',
  startYear: 2000,
  endYear: NATIVE_AMERICAN_CHECKED_THROUGH,
  description: 'Golden dollars with Sacagawea on the front; since 2009 a new Native American theme on the back each year',
  category: 'circulating',
  mintMarks: ['P', 'D'],
  specificCoins: toSpecificCoins(NATIVE_AMERICAN_DOLLARS, 'Native American Dollar'),
};
