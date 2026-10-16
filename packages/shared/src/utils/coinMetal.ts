// What a coin is made of, for the "Silver" and "Gold" quick chips and the
// disc colors. Until 2026-10 those read the purchase price, a leftover from
// the pricing app; now they mean metal.
//
// In order:
// 1. The composition saved from a scan ("90% Silver", "Copper-Nickel Clad").
// 2. The coin's own words: "Silver Eagle", "Morgan Dollar", "Double Eagle".
// 3. United States rules by denomination and year, which are well documented.
// Anything else is unknown (null) rather than guessed.
import type { AlbumDiscTone } from '../types/album';
import type { Coin } from '../types/coin';
import { resolveCountryCode } from '../data/worldCountries';
import { mintMarkLetter, normalizeDenomination, normalizeText } from './normalize';

export type CoinMetal = 'gold' | 'silver' | 'nickel' | 'copper' | 'steel' | 'brass' | 'other';

/** The metal named in a composition string, or null when there's no text. */
export function metalFromComposition(composition: string | null | undefined): CoinMetal | null {
  const t = normalizeText(composition);
  if (!t) return null;
  // Silver first: "40% silver clad" is a silver coin.
  if (/\bsilver\b/.test(t)) return 'silver';
  // \bgold\b, so "golden" (manganese-brass dollars) doesn't count.
  if (/\bgold\b/.test(t)) return 'gold';
  if (/\bsteel\b/.test(t)) return 'steel';
  if (/\bbrass\b|\bmanganese\b/.test(t)) return 'brass';
  // Before copper: "copper nickel clad" is a nickel-colored coin.
  if (/\bnickel\b|\bclad\b|\bcupronickel\b|\bcupro\b/.test(t)) return 'nickel';
  if (/\bcopper\b|\bbronze\b|\bzinc\b/.test(t)) return 'copper';
  return 'other';
}

// Series and denominations whose name settles the metal.
const SILVER_SERIES = /\b(morgan|peace dollar|mercury|barber|seated liberty|standing liberty|walking liberty|franklin)\b/;
const GOLD_DENOMINATIONS = /\b(gold dollar|quarter eagle|half eagle|double eagle|eagle)\b/;

function metalFromWords(coin: Pick<Coin, 'name' | 'series' | 'specificCoinName' | 'denomination'>): CoinMetal | null {
  const words = normalizeText([coin.name, coin.series, coin.specificCoinName, coin.denomination].filter(Boolean).join(' '));
  if (!words) return null;
  if (/\bsilver\b/.test(words)) return 'silver';
  if (/\bgold\b/.test(words)) return 'gold';
  if (SILVER_SERIES.test(words)) return 'silver';
  // "Silver Eagle" was caught above; any other eagle is a gold denomination.
  if (GOLD_DENOMINATIONS.test(words)) return 'gold';
  return null;
}

function usMetal(coin: Pick<Coin, 'year' | 'denomination' | 'mintMark'>): CoinMetal | null {
  const year = coin.year;
  if (!year || year <= 0) return null;
  switch (normalizeDenomination(coin.denomination)) {
    case 'cent':
      return year === 1943 ? 'steel' : 'copper';
    case 'nickel': {
      // Wartime nickels, 35% silver: all of 1943–1945, and 1942 struck with
      // the large P or S mint mark above Monticello.
      if (year >= 1943 && year <= 1945) return 'silver';
      const mark = mintMarkLetter(coin.mintMark);
      if (year === 1942 && (mark === 'P' || mark === 'S')) return 'silver';
      return 'nickel';
    }
    case 'dime':
    case 'quarter':
      return year <= 1964 ? 'silver' : 'nickel';
    case 'half dollar':
      // 90% silver through 1964, 40% from 1965 to 1970, clad after.
      return year <= 1970 ? 'silver' : 'nickel';
    case 'dollar':
      if (year <= 1935) return 'silver';
      if (year >= 1971 && year <= 1999) return 'nickel';
      // Sacagawea, Presidential, and Native American dollars: golden-colored brass.
      if (year >= 2000) return 'brass';
      return null;
    default:
      return null;
  }
}

type MetalInput = Pick<
  Coin,
  'name' | 'series' | 'specificCoinName' | 'denomination' | 'country' | 'year' | 'mintMark' | 'composition'
>;

/** What the coin is made of, or null when it can't be told. */
export function coinMetal(coin: MetalInput): CoinMetal | null {
  const fromComposition = metalFromComposition(coin.composition);
  if (fromComposition && fromComposition !== 'other') return fromComposition;
  const fromWords = metalFromWords(coin);
  if (fromWords) return fromWords;
  if (resolveCountryCode(coin.country) === 'US') return usMetal(coin);
  return fromComposition;
}

/**
 * The disc color for a coin: its metal's color. Brass dollars look gold;
 * clad, nickel, and steel look silver. Unknown stays copper, as before.
 */
export function metalDiscTone(coin: MetalInput): AlbumDiscTone {
  switch (coinMetal(coin)) {
    case 'gold':
    case 'brass':
      return 'gold';
    case 'silver':
    case 'nickel':
    case 'steel':
      return 'silver';
    default:
      return 'copper';
  }
}
