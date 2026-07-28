// Album (series checklist) definitions — the "digital Whitman folder" feature.
// Albums are pure data; slot filling is computed at read time by the mobile
// albumService from the user's coins. No dedicated DB tables: assignments are
// written to the existing series_id / specific_coin_id / specific_coin_name
// columns on coins.

export type AlbumId =
  | 'awq'
  | 'state_quarters'
  | 'lincoln_wheat'
  | 'lincoln_memorial'
  | 'lincoln_shield'
  | 'world';

/**
 * Sentinel written to coins.specific_coin_id when the user says "not this
 * coin" on a filled slot. A cleared null would let the heuristics instantly
 * re-fill the slot with the same coin; the sentinel excludes it from album
 * matching entirely.
 */
export const EXCLUDED_SPECIFIC_COIN_ID = '__none__';

/** Matches the mobile design system's CoinDisc tones. */
export type AlbumDiscTone = 'gold' | 'silver' | 'copper';

/**
 * How a slot recognizes a coin, beyond an explicit specific_coin_id tag.
 * - design: year equality + at least one keyword substring over the coin's
 *   normalized name/series text (mint mark ignored) — quarter designs.
 * - yearMint: year + folded mint mark equality, optionally keyword-gated
 *   (2009 Bicentennial cents) — date/mint runs like Lincoln cents.
 * - country: coin's country resolves to this country code — World album.
 */
export type SlotMatch =
  | { kind: 'design'; year: number; keywords: string[]; excludeKeywords?: string[] }
  | { kind: 'yearMint'; year: number; mintMark: string; keywords?: string[]; excludeKeywords?: string[] }
  | { kind: 'country'; countryCode: string };

export interface AlbumSlot {
  /** For series albums this equals the SpecificCoin id written on assignment. */
  id: string;
  /** Short label under the slot cell, e.g. "Angelou", "1909-S V.D.B.", "Delaware". */
  label: string;
  sublabel?: string;
  match: SlotMatch;
}

export interface AlbumSection {
  id: string;
  title: string;
  slots: AlbumSlot[];
}

export interface Album {
  id: AlbumId;
  title: string;
  subtitle: string;
  /** 'series' albums support assignment; the 'world' album is read-only. */
  kind: 'series' | 'world';
  /** CoinSeries id written to coins.series_id on assignment (series albums). */
  seriesId?: string;
  discTone: AlbumDiscTone;
  sections: AlbumSection[];
  totalSlots: number;
}
