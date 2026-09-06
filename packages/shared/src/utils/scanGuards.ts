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

import { MINT_MARK_NONE, MINT_MARK_UNKNOWN, canonicalizeMintMark } from './normalize';
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
 * Every mint mark the United States has struck: Philadelphia, Denver, San
 * Francisco, West Point, Carson City, New Orleans, Charlotte and Dahlonega.
 * The last two closed in 1861 and are kept because their coins are collected.
 */
const US_MINT_MARKS = new Set(['P', 'D', 'S', 'W', 'CC', 'O', 'C']);

/**
 * Only countries we have actually researched appear here. A whitelist we
 * guessed at would reject more real marks than invented ones — Germany alone
 * uses A, D, F, G and J — so an unlisted country's mark is kept as read.
 */
const MINT_MARKS_BY_COUNTRY: Record<string, Set<string>> = { US: US_MINT_MARKS };

/**
 * Canonicalize a recognised mint mark, and fold it to UNKNOWN when that
 * country's mints never struck it.
 *
 * UNKNOWN is the honest answer for an unreadable mark, and it is also the
 * safe one: no album slot matches it, so a misread coin stays available for
 * manual assignment instead of silently claiming a slot it does not belong in.
 */
export function sanitizeRecognizedMintMark(
  input: string | null | undefined,
  country: string | null | undefined
): string | null {
  const mark = canonicalizeMintMark(input);
  if (mark === null) return null;
  // The sentinels are statements about legibility rather than marks, and NONE
  // is a real observation on any US coin struck before 1979. Neither is a
  // letter to check against a mint's roster.
  if (mark === MINT_MARK_NONE || mark === MINT_MARK_UNKNOWN) return mark;

  const code = resolveCountryCode(country);
  const known = code ? MINT_MARKS_BY_COUNTRY[code] : undefined;
  if (!known) return mark;

  return known.has(mark) ? mark : MINT_MARK_UNKNOWN;
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
  // Only a mark the country guard *changed* counts — a mark the recogniser
  // itself reported as illegible is doing the right thing, not failing.
  if (mintMark === MINT_MARK_UNKNOWN && canonicalizeMintMark(input.mintMark) !== MINT_MARK_UNKNOWN) {
    rejected.push('mintMark');
  }

  return { year, mintMark, rejected };
}
