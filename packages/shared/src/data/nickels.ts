import type { CoinSeries } from '../types/series';
import { DateMintDef, annotateDefs, buildDateMintDefs, byYearThenMint, toSpecificCoins, years } from './dateMintRuns';

// Buffalo (1913-1938) and Jefferson (1938-) nickels. One module because they
// overlap in 1938: a plain "1938-D nickel" must not fill a slot in both
// albums, so the 1938 slots of each need the series named.
//
// Verified 2026-10-24 against the Jefferson and Buffalo mintage tables in
// Wikipedia's "United States nickel mintage figures" (read as raw wikitext,
// row by row), cross-checked with the NGC price guide and, for 2022-2026,
// CoinNews's reprints of the US Mint's monthly production figures.
// Business strikes only. Proofs, the 1994-P/1997-P matte and 2017-S enhanced
// collector issues, and varieties (1914/3, 1918/7-D, 1937-D 3 legs,
// 1939 doubled Monticello, 1943/2-P, 1955-D/S) are left out.

// --- Buffalo nickels: 64 business strikes ---
// Not struck at all in 1922, 1932, 1933. 1913 comes in two types (bison on
// a mound, then on a plain) at all three mints.
// Philadelphia: 1913-1937 except 1922, 1931-1933.
// Denver: 1913-1920, 1924-1929, 1934-1938.
// San Francisco: 1913-1921, 1923-1931, 1935-1937.
function buildBuffaloNickels(): DateMintDef[] {
  const defs = buildDateMintDefs('buffalo', [
    { mintMark: '', years: years(1914, 1937, [1922, 1931, 1932, 1933]) },
    { mintMark: 'D', years: [...years(1914, 1920), ...years(1924, 1929), ...years(1934, 1938)] },
    { mintMark: 'S', years: [...years(1914, 1921), ...years(1923, 1931), ...years(1935, 1937)] },
  ]);
  const type1913: DateMintDef[] = [];
  for (const [type, keywords] of [
    ['1', ['type 1', 'mound']],
    ['2', ['type 2', 'plain']],
  ] as const) {
    for (const mintMark of ['', 'D', 'S']) {
      type1913.push({
        id: `buffalo_1913${mintMark ? `_${mintMark.toLowerCase()}` : ''}_type${type}`,
        name: `1913${mintMark ? `-${mintMark}` : ''} Type ${type}`,
        year: 1913,
        mintMark,
        sublabel: type === '1' ? 'On mound' : 'On plain',
        keywords: [...keywords],
      });
    }
  }
  return annotateDefs([...type1913, ...defs].sort(byYearThenMint), {
    // Shares 1938 with the Jefferson nickel; see the note at the top.
    buffalo_1938_d: { keywords: ['buffalo', 'indian head', 'bison'] },
  });
}

// --- Jefferson nickels: 196 business strikes, 1938-2026 ---
// Philadelphia, no mark: 1938-1942, 1946-1979 (1965-1967 carry no mark at any
// mint and get one slot each); none struck 1968-1970. P mark: the 1942-1945
// wartime silver nickels (large P over Monticello, the first P mint mark), and
// 1980 on. Denver: 1938-1964, 1968 on (1942-D is regular metal only).
// San Francisco: 1938-1941, 1942-1945 silver (no regular 1942-S), 1946-1949,
// 1951-1954, 1968-1970.
// 2004-2005 are the Westward Journey designs, two a year at P and D.
// 2026 is still the Jefferson nickel, dual-dated 1776-2026.
export const JEFFERSON_CHECKED_THROUGH = 2026;

const WESTWARD_JOURNEY = [
  { year: 2004, key: 'peace_medal', title: 'Peace Medal', keywords: ['peace medal', 'louisiana purchase', 'handshake'] },
  { year: 2004, key: 'keelboat', title: 'Keelboat', keywords: ['keelboat'] },
  { year: 2005, key: 'bison', title: 'American Bison', keywords: ['bison', 'buffalo'] },
  { year: 2005, key: 'ocean', title: 'Ocean in View', keywords: ['ocean'] },
];

function buildJeffersonNickels(throughYear: number): DateMintDef[] {
  const defs = buildDateMintDefs('jefferson', [
    { mintMark: '', years: [...years(1938, 1945), ...years(1946, 1967), ...years(1971, throughYear)] },
    { mintMark: 'D', years: [...years(1938, 1964), ...years(1968, throughYear)] },
    { mintMark: 'S', years: [...years(1938, 1949), ...years(1951, 1954), ...years(1968, 1970)] },
  ]).filter(def => def.year !== 2004 && def.year !== 2005);

  // 1942 Philadelphia struck both metals: the regular no-mark coin and the
  // silver 1942-P. "P" and no mark file together, so the metal tells them apart.
  defs.push({
    id: 'jefferson_1942_p_silver',
    name: '1942-P',
    year: 1942,
    mintMark: '',
    sublabel: 'Wartime silver',
    keywords: ['silver', 'war'],
  });
  for (const design of WESTWARD_JOURNEY) {
    for (const mintMark of ['', 'D']) {
      defs.push({
        id: `jefferson_${design.year}_${design.key}${mintMark ? '_d' : '_p'}`,
        name: `${design.year}-${mintMark || 'P'} ${design.title}`,
        year: design.year,
        mintMark,
        sublabel: 'Westward Journey',
        keywords: design.keywords,
      });
    }
  }

  const annotations: Record<string, Partial<Omit<DateMintDef, 'id' | 'year' | 'mintMark'>>> = {
    jefferson_1938: { keywords: ['jefferson', 'monticello'] },
    jefferson_1938_d: { keywords: ['jefferson', 'monticello'] },
    jefferson_1938_s: { keywords: ['jefferson', 'monticello'] },
    jefferson_1942: { excludeKeywords: ['silver', 'war'] },
    jefferson_1942_s: { sublabel: 'Wartime silver' },
  };
  for (const year of [1943, 1944, 1945]) {
    annotations[`jefferson_${year}`] = { name: `${year}-P`, sublabel: 'Wartime silver' };
    annotations[`jefferson_${year}_d`] = { sublabel: 'Wartime silver' };
    annotations[`jefferson_${year}_s`] = { sublabel: 'Wartime silver' };
  }
  for (const year of [1965, 1966, 1967]) annotations[`jefferson_${year}`] = { sublabel: 'No mint mark' };
  for (const year of years(1980, throughYear)) {
    if (year !== 2004 && year !== 2005) annotations[`jefferson_${year}`] = { name: `${year}-P` };
  }
  if (throughYear >= 2026) {
    annotations.jefferson_2026 = { name: '2026-P', sublabel: '1776–2026' };
    annotations.jefferson_2026_d = { sublabel: '1776–2026' };
  }
  return annotateDefs(defs, annotations).sort(byYearThenMint);
}

export const BUFFALO_NICKELS: DateMintDef[] = buildBuffaloNickels();
export const JEFFERSON_NICKELS: DateMintDef[] = buildJeffersonNickels(JEFFERSON_CHECKED_THROUGH);

export const NICKEL_SERIES: CoinSeries[] = [
  {
    id: 'buffalo_nickels',
    name: 'Buffalo Nickels',
    shortName: 'Buffalo Nickels',
    country: 'United States',
    denomination: 'Nickel',
    startYear: 1913,
    endYear: 1938,
    description: 'Indian Head nickels designed by James Earle Fraser, with the bison on the reverse',
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: toSpecificCoins(BUFFALO_NICKELS, 'Buffalo Nickel'),
  },
  {
    id: 'jefferson_nickels',
    name: 'Jefferson Nickels',
    shortName: 'Jefferson Nickels',
    country: 'United States',
    denomination: 'Nickel',
    startYear: 1938,
    endYear: JEFFERSON_CHECKED_THROUGH,
    description: 'Nickels with Thomas Jefferson and his home, Monticello, first designed by Felix Schlag',
    category: 'circulating',
    mintMarks: ['', 'P', 'D', 'S'],
    specificCoins: toSpecificCoins(JEFFERSON_NICKELS, 'Jefferson Nickel'),
  },
];
