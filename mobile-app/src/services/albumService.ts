import {
  Album,
  AlbumSlot,
  SlotMatch,
  EXCLUDED_SPECIFIC_COIN_ID,
  getSeriesById,
  getSpecificCoinById,
  resolveCountryCode,
  normalizeText,
  normalizeCountry,
  normalizeDenomination,
  isKnownDenomination,
  normalizeMintMark,
} from '@coin-collecting/shared';
import { Coin } from '../types/coin';

// Pure slot-fill computation for the Albums feature. No I/O — screens pass in
// the user's coins and render the result. Precedence per slot:
//   1. explicit tag (coin.specificCoinId === slot.id), best-ranked on duplicates
//   2. heuristics over untagged coins (domain gate, then per-slot match)
// Coins tagged with the '__none__' sentinel are excluded from series albums
// entirely ("not this coin"). One coin fills at most one slot per album;
// filling slots in different albums is fine (a Delaware quarter fills both
// 50 State Quarters and World/US).

export interface SlotFill {
  coin: Coin;
  source: 'explicit' | 'heuristic';
  /** World album only: how many coins the user has from this country. */
  coinCount?: number;
}

/** slotId -> fill for one album. Unfilled slots are absent. */
export type AlbumFills = Map<string, SlotFill>;

export interface CandidateCoins {
  /** Coins the heuristics believe belong in this slot. */
  likely: Coin[];
  /** The rest of the collection, for manual override. */
  other: Coin[];
}

/** Fields written to a coin when assigning it to a slot (CoinService.updateCoin). */
export interface SlotAssignment {
  seriesId: string;
  specificCoinId: string;
  specificCoinName: string;
  series: string;
}

const US_COUNTRY_CODE = 'US';

function hasImage(coin: Coin): boolean {
  return Boolean(coin.obverseImage || (coin.images && coin.images.length > 0));
}

/**
 * Preference order when several coins could fill the same slot:
 * has a photo, then oldest in the collection, then id for determinism.
 */
function rankCoins(a: Coin, b: Coin): number {
  const imageDiff = Number(hasImage(b)) - Number(hasImage(a));
  if (imageDiff !== 0) return imageDiff;
  const aCreated = a.createdAt ?? '';
  const bCreated = b.createdAt ?? '';
  if (aCreated !== bCreated) return aCreated < bCreated ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

function best(coins: Coin[]): Coin {
  return [...coins].sort(rankCoins)[0];
}

/** Normalized haystack for keyword matching over a coin's descriptive text. */
function coinSearchText(coin: Coin): string {
  return normalizeText(
    [coin.specificCoinName, coin.honoree, coin.theme, coin.name, coin.title, coin.series]
      .filter(Boolean)
      .join(' '),
  );
}

function keywordsMatch(text: string, keywords?: string[], excludeKeywords?: string[]): boolean {
  if (excludeKeywords?.some(keyword => text.includes(keyword))) return false;
  if (!keywords || keywords.length === 0) return true;
  return keywords.some(keyword => text.includes(keyword));
}

/**
 * Can this coin plausibly belong to this series album at all?
 * US (or unknown) country, and not already tagged to a different series.
 *
 * Denomination is deliberately NOT checked here — it is checked per slot, in
 * matchesSlot, because design slots and date/mint slots can afford different
 * amounts of doubt about it.
 */
function passesDomainGate(coin: Coin, albumSeriesId: string): boolean {
  if (coin.country) {
    const code = resolveCountryCode(coin.country);
    // Unresolvable country text is treated as unknown, not foreign.
    if (code && code !== US_COUNTRY_CODE) return false;
  }
  if (coin.seriesId && coin.seriesId !== albumSeriesId) return false;
  return true;
}

/** The coin's denomination is recognized and is this album's. */
function denominationAgrees(coin: Coin, albumDenomination: string): boolean {
  return (
    isKnownDenomination(coin.denomination) &&
    normalizeDenomination(coin.denomination) === albumDenomination
  );
}

/** False only when the denomination is recognized and belongs to something else. */
function denominationNotContradicted(coin: Coin, albumDenomination: string): boolean {
  return !isKnownDenomination(coin.denomination) || denominationAgrees(coin, albumDenomination);
}

function matchesSlot(coin: Coin, match: SlotMatch, albumDenomination: string): boolean {
  switch (match.kind) {
    case 'design': {
      // A design slot already demands a year hit plus a distinctive keyword,
      // which is enough on its own — so an unrecognized denomination
      // ("Commemorative", "Regular issue") is tolerated here. A recognized but
      // different one is still positive evidence against, and disqualifies.
      if (!denominationNotContradicted(coin, albumDenomination)) return false;
      if (coin.year !== match.year) return false;
      const text = coinSearchText(coin);
      // Design slots need positive evidence: a generic "1999 Quarter" matches
      // nothing and stays manual.
      if (!text) return false;
      return (
        !match.excludeKeywords?.some(keyword => text.includes(keyword)) &&
        match.keywords.some(keyword => text.includes(keyword))
      );
    }
    case 'yearMint': {
      // Most date/mint slots carry no keywords, so year + mint mark is the
      // whole test — far too weak to also guess at the denomination. Without
      // this, a 2013 bullion round would fill the 2013 Lincoln cent slot.
      if (!denominationAgrees(coin, albumDenomination)) return false;
      if (coin.year !== match.year) return false;
      if (normalizeMintMark(coin.mintMark) !== match.mintMark) return false;
      return keywordsMatch(coinSearchText(coin), match.keywords, match.excludeKeywords);
    }
    case 'country':
      return resolveCountryCode(coin.country) === match.countryCode;
  }
}

function albumDenomination(album: Album): string {
  const series = album.seriesId ? getSeriesById(album.seriesId) : undefined;
  return normalizeDenomination(series?.denomination ?? '');
}

function allSlots(album: Album): AlbumSlot[] {
  return album.sections.flatMap(section => section.slots);
}

function computeWorldFills(album: Album, coins: Coin[]): AlbumFills {
  const byCountry = new Map<string, Coin[]>();
  for (const coin of coins) {
    const code = resolveCountryCode(coin.country);
    if (!code) continue;
    if (!byCountry.has(code)) byCountry.set(code, []);
    byCountry.get(code)!.push(coin);
  }

  const fills: AlbumFills = new Map();
  for (const slot of allSlots(album)) {
    if (slot.match.kind !== 'country') continue;
    const countryCoins = byCountry.get(slot.match.countryCode);
    if (!countryCoins) continue;
    fills.set(slot.id, {
      coin: best(countryCoins),
      source: 'heuristic',
      coinCount: countryCoins.length,
    });
  }
  return fills;
}

export function computeAlbumFills(album: Album, coins: Coin[]): AlbumFills {
  if (album.kind === 'world') return computeWorldFills(album, coins);

  const fills: AlbumFills = new Map();
  const slots = allSlots(album);
  const eligible = coins.filter(coin => coin.specificCoinId !== EXCLUDED_SPECIFIC_COIN_ID);

  // 1. Explicit tags.
  const explicitBySlot = new Map<string, Coin[]>();
  for (const coin of eligible) {
    if (!coin.specificCoinId) continue;
    if (!explicitBySlot.has(coin.specificCoinId)) explicitBySlot.set(coin.specificCoinId, []);
    explicitBySlot.get(coin.specificCoinId)!.push(coin);
  }
  for (const slot of slots) {
    const claimants = explicitBySlot.get(slot.id);
    if (claimants) fills.set(slot.id, { coin: best(claimants), source: 'explicit' });
  }

  // 2. Heuristics: untagged coins passing the domain gate, one slot each.
  const denomination = albumDenomination(album);
  const seriesId = album.seriesId ?? '';
  const pool = eligible.filter(coin => !coin.specificCoinId && passesDomainGate(coin, seriesId));
  const used = new Set<string>();
  for (const slot of slots) {
    if (fills.has(slot.id)) continue;
    const candidates = pool.filter(
      coin => !used.has(coin.id) && matchesSlot(coin, slot.match, denomination),
    );
    if (candidates.length === 0) continue;
    const winner = best(candidates);
    used.add(winner.id);
    fills.set(slot.id, { coin: winner, source: 'heuristic' });
  }

  return fills;
}

export interface AlbumProgress {
  filled: number;
  total: number;
}

export function computeAlbumProgress(album: Album, coins: Coin[]): AlbumProgress {
  return { filled: computeAlbumFills(album, coins).size, total: album.totalSlots };
}

/**
 * Candidates for the manual-assign sheet on a series-album slot. "Likely" are
 * domain-gated heuristic matches (including sentinel-excluded and already
 * tagged coins — the user is explicitly overriding); everything else lands in
 * "other", newest first.
 */
export function findCandidateCoins(album: Album, slot: AlbumSlot, coins: Coin[]): CandidateCoins {
  const denomination = albumDenomination(album);
  const seriesId = album.seriesId ?? '';
  const likely = coins
    .filter(
      coin => passesDomainGate(coin, seriesId) && matchesSlot(coin, slot.match, denomination),
    )
    .sort(rankCoins);
  const likelyIds = new Set(likely.map(coin => coin.id));
  const other = coins
    .filter(coin => !likelyIds.has(coin.id))
    .sort((a, b) => ((a.createdAt ?? '') > (b.createdAt ?? '') ? -1 : 1));
  return { likely, other };
}

/** Update payload assigning a coin to a slot. */
export function buildSlotAssignment(album: Album, slot: AlbumSlot): SlotAssignment | null {
  if (!album.seriesId) return null;
  const series = getSeriesById(album.seriesId);
  const specificCoin = getSpecificCoinById(album.seriesId, slot.id);
  if (!series || !specificCoin) return null;
  return {
    seriesId: album.seriesId,
    specificCoinId: slot.id,
    specificCoinName: specificCoin.name,
    series: series.name,
  };
}

/** Update payload for "not this coin": excludes the coin from album matching. */
export function buildSlotRemoval(): Pick<Coin, 'specificCoinId'> {
  return { specificCoinId: EXCLUDED_SPECIFIC_COIN_ID };
}

/**
 * Scan-to-slot (Phase D): given recognition output, return tag fields when the
 * described coin unambiguously matches exactly one slot across all series
 * albums; null otherwise. Never blocks a save.
 */
export interface ScanRecognitionInput {
  name?: string | null;
  design?: string | null;
  year?: number | null;
  mintMark?: string | null;
  country?: string | null;
  denomination?: string | null;
}

export function resolveScanAlbumTag(
  recognition: ScanRecognitionInput,
  albums: Album[],
): SlotAssignment | null {
  if (!recognition.year) return null;
  const countryCode = resolveCountryCode(recognition.country);
  if (countryCode && countryCode !== US_COUNTRY_CODE) return null;

  const pseudoCoin = {
    year: recognition.year,
    mintMark: recognition.mintMark ?? null,
    country: recognition.country ?? null,
    denomination: recognition.denomination ?? '',
    name: [recognition.name, recognition.design].filter(Boolean).join(' '),
    title: '',
    series: null,
    seriesId: null,
    specificCoinId: null,
    specificCoinName: null,
    honoree: null,
    theme: null,
  } as unknown as Coin;

  let found: SlotAssignment | null = null;
  for (const album of albums) {
    if (album.kind !== 'series') continue;
    const denomination = albumDenomination(album);
    if (!passesDomainGate(pseudoCoin, album.seriesId ?? '')) continue;
    for (const slot of allSlots(album)) {
      if (!matchesSlot(pseudoCoin, slot.match, denomination)) continue;
      if (found) return null; // ambiguous — leave untagged
      found = buildSlotAssignment(album, slot);
    }
  }
  return found;
}
