// Plausibility guards for recogniser output.
//
// The recogniser scores its own answers, but that score has not tracked
// correctness: the scan that read a 2024 quarter as 2034 and invented an "F"
// mint mark still came back HIGH. These guards catch the two classes of error
// that are checkable *without knowing the coin* — a date that cannot exist,
// and a mint mark that country never struck — and fold them to unanswered
// rather than storing a confident fiction.
//
// They are deliberately narrow. Anything needing numismatic judgement (is this
// really a half dollar? is PR-67 a defensible grade?) belongs in the prompt,
// not here, because a guard that needs to know the coin can only guess too.

import {
  MINT_MARK_NONE,
  MINT_MARK_UNKNOWN,
  canonicalizeMintMark,
  isIllegibleMintMarkPhrase,
  normalizeText,
} from './normalize';
import { resolveCountryCode } from '../data/worldCountries';

/**
 * Earliest year a coin could bear. Lydian staters — the usual "first coins" —
 * date to roughly 630 BC. Ancient coins are almost never dated on the coin
 * itself, so this floor is here to reject parse garbage, not to adjudicate
 * numismatics.
 */
export const EARLIEST_PLAUSIBLE_COIN_YEAR = -700;

/**
 * A struck year, or null when the value cannot be one.
 *
 * Next year is allowed: mints strike the coming year's coinage in the closing
 * months of the current one, so a 2027 cent is a real thing to photograph in
 * late 2026. Two years out is not.
 *
 * Returns null rather than a corrected guess — the app stores 0 for "no year"
 * and every year-aware screen filters that out, so a rejected date disappears
 * from the collection's date range instead of distorting it.
 */
export function sanitizeMintYear(
  input: unknown,
  currentYear: number = new Date().getFullYear()
): number | null {
  if (typeof input !== 'number' || !Number.isInteger(input)) return null;
  // There is no year zero, and 0 is the app's own "unanswered" sentinel.
  if (input === 0) return null;
  if (input < EARLIEST_PLAUSIBLE_COIN_YEAR) return null;
  if (input > currentYear + 1) return null;
  return input;
}

/**
 * A country whose mints we have actually researched.
 *
 * Listing a country here is a claim that `marks` is *complete* — anything
 * missing from it gets folded to UNKNOWN on a real user's coin. That is a
 * promise to keep deliberately, so a country belongs here only when its full
 * roster has been checked, not when it seems familiar. Everywhere else is
 * covered by the structural rules below, which need no country knowledge.
 */
interface MintRoster {
  /** Every mark this country's mints have struck, across all eras. */
  marks: ReadonlySet<string>;
  /**
   * Mint names the recogniser writes when it has read the mark but chosen to
   * name the facility instead. Matched on normalized text.
   */
  cities?: Readonly<Record<string, string>>;
}

/**
 * The United States, complete. Philadelphia (P, or no mark before 1979),
 * Denver, San Francisco, West Point, Carson City, New Orleans, Charlotte and
 * Dahlonega — the last two closed in 1861 — plus Manila, which struck US
 * coinage from 1920 to 1941 and is the one people forget.
 *
 * D and C each cover two mints from different centuries (Denver/Dahlonega,
 * Charlotte/Chihuahua-era Carolina gold); the letter is the same either way,
 * so the roster does not need to tell them apart.
 */
const US_ROSTER: MintRoster = {
  marks: new Set(['P', 'D', 'S', 'W', 'CC', 'O', 'C', 'M']),
  cities: {
    philadelphia: 'P',
    denver: 'D',
    'san francisco': 'S',
    'west point': 'W',
    'carson city': 'CC',
    'new orleans': 'O',
    charlotte: 'C',
    dahlonega: 'D',
    manila: 'M',
  },
};

const MINT_ROSTERS: Readonly<Record<string, MintRoster>> = { US: US_ROSTER };

/**
 * Three-character mint marks, worldwide. There are almost none — Potosí is the
 * standard example — which is what makes the length worth checking: a
 * three-letter token from a country we have no roster for is far more likely
 * to be a truncated word than a mark.
 */
const THREE_CHAR_MARKS: ReadonlySet<string> = new Set(['PTS']);

/**
 * Canonicalize a recognised mint mark, folding to UNKNOWN only what cannot be
 * a mark on this coin.
 *
 * Two layers, and the order matters for anyone outside the US:
 *
 *   1. Structural, applied everywhere. Real mint marks are one or two letters
 *      (three in a handful of cases). Prose is not a mark. This is the layer
 *      that protects collectors of coins we know nothing about, and it needs
 *      no roster to work.
 *   2. Roster, applied only where `MINT_ROSTERS` has an entry. Strict, because
 *      completeness has been checked for that country specifically.
 *
 * A country with no roster keeps any one- or two-letter mark as read. That is
 * the deliberate answer to "would a US whitelist break German coins": Germany
 * uses A, B, C, D, E, F, G, H, J and T, France ran mints on most of the
 * alphabet, and Mexico uses two-letter marks throughout — so an unresearched
 * country is trusted rather than second-guessed. Guessing a roster would
 * reject far more real marks than invented ones.
 *
 * When the guard does fold, it costs one field: UNKNOWN is editable from the
 * review screen, and no album slot matches it, so a misread coin stays
 * available for manual assignment instead of claiming a slot it does not fit.
 */
export function sanitizeRecognizedMintMark(
  input: string | null | undefined,
  country: string | null | undefined
): string | null {
  const code = resolveCountryCode(country);
  const roster = code ? MINT_ROSTERS[code] : undefined;

  // Before canonicalizing: the recogniser sometimes names the mint rather than
  // the mark, and that is a reading, not a failure to read. Recovering it beats
  // discarding it — but only against a roster, so "Denver" on a coin from
  // somewhere else is never quietly turned into a US mint mark.
  const named = roster?.cities?.[normalizeText(input)];
  if (named) return named;

  const mark = canonicalizeMintMark(input);
  if (mark === null) return null;
  // The sentinels are statements about legibility rather than marks, and NONE
  // is a real observation on any US coin struck before 1979. Neither is a
  // letter to check against a mint's roster.
  if (mark === MINT_MARK_NONE || mark === MINT_MARK_UNKNOWN) return mark;

  if (roster) return roster.marks.has(mark) ? mark : MINT_MARK_UNKNOWN;

  // No roster: trust the reading, but not a three-letter token, which is what
  // a truncated word looks like.
  if (mark.length <= 2) return mark;
  return THREE_CHAR_MARKS.has(mark) ? mark : MINT_MARK_UNKNOWN;
}

export interface GuardedRecognitionFields {
  year: number | null;
  mintMark: string | null;
  /** Names of the fields a guard overrode. Empty when nothing was rejected. */
  rejected: string[];
}

/**
 * Apply both guards to one recognition result, reporting what they overrode so
 * the caller can log it. The rejection list is the only running measure we have
 * of how often the recogniser states something impossible.
 */
export function guardRecognizedFields(input: {
  year: unknown;
  mintMark: string | null | undefined;
  country: string | null | undefined;
}): GuardedRecognitionFields {
  const year = sanitizeMintYear(input.year);
  const mintMark = sanitizeRecognizedMintMark(input.mintMark, input.country);

  const rejected: string[] = [];
  if (input.year != null && year === null) rejected.push('year');
  // A mark the recogniser itself reported as illegible is it working, not
  // failing, so only an override of something it actually asserted counts.
  // Checked against the raw input rather than the canonical form, because
  // canonicalizing now folds prose to UNKNOWN on its own — comparing the two
  // canonical values would silently stop counting the "Philadelphia" class of
  // error, which is exactly the one worth measuring.
  if (mintMark === MINT_MARK_UNKNOWN && !isIllegibleMintMarkPhrase(input.mintMark)) {
    rejected.push('mintMark');
  }

  return { year, mintMark, rejected };
}
