// Text normalizers shared by album/series matching. All matching in the app
// compares normalized strings so user-entered data ("Türkiye", "V.D.B.",
// "washington, D.C.") lines up with the curated definitions.

// Characters removed entirely (no space left behind): periods and apostrophe
// variants, so "V.D.B." -> "vdb" and "Côte d'Ivoire" -> "cote divoire".
const REMOVED_CHARS = /[.'’ʻ`´]/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

/**
 * Lowercase, strip diacritics, drop periods/apostrophes, collapse all other
 * punctuation and whitespace to single spaces.
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(REMOVED_CHARS, '')
    .replace(NON_ALPHANUMERIC, ' ')
    .trim();
}

/** normalizeText plus stripping a leading "the " ("The Netherlands" -> "netherlands"). */
export function normalizeCountry(input: string | null | undefined): string {
  const text = normalizeText(input);
  return text.startsWith('the ') ? text.slice(4) : text;
}

const DENOMINATION_ALIASES: Record<string, string[]> = {
  cent: ['cent', 'cents', 'penny', 'pennies', 'one cent', '1 cent', '1c', '001', '0 01'],
  nickel: ['nickel', 'nickels', 'five cents', '5 cents', '5c', '005', '0 05'],
  dime: ['dime', 'dimes', 'ten cents', '10 cents', '10c', '010', '0 10'],
  quarter: [
    'quarter',
    'quarters',
    'quarter dollar',
    'quarter dollars',
    'twenty five cents',
    '25 cents',
    '25c',
    '025',
    '0 25',
  ],
  'half dollar': ['half dollar', 'half dollars', 'fifty cents', '50 cents', '50c', '050', '0 50'],
  dollar: ['dollar', 'dollars', 'one dollar', '1 dollar', '1'],
};

const DENOMINATION_LOOKUP: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(DENOMINATION_ALIASES)) {
  DENOMINATION_LOOKUP[canonical] = canonical;
  for (const alias of aliases) {
    DENOMINATION_LOOKUP[normalizeText(alias)] = canonical;
  }
}

/**
 * Map denomination variants ("Penny", "25 cents", "$0.25") to a canonical
 * form ("cent", "quarter", ...). Unrecognized input returns its normalized text.
 */
export function normalizeDenomination(input: string | null | undefined): string {
  const text = normalizeText(input);
  return DENOMINATION_LOOKUP[text] ?? text;
}

/**
 * Whether this text names a denomination we actually understand.
 *
 * The field is free text, and collectors routinely file coins under a category
 * instead ("Commemorative", "Regular issue", "Bullion") or under a series name
 * ("Morgan Dollar"). Callers need to distinguish that — a denomination we
 * don't recognize is missing information, not a contradiction, and shouldn't
 * be treated as evidence that a coin belongs somewhere else.
 */
export function isKnownDenomination(input: string | null | undefined): boolean {
  return normalizeText(input) in DENOMINATION_LOOKUP;
}

/**
 * Stored value meaning "this coin carries no mint mark" — a positive
 * observation, not an absent one. On US coins that means Philadelphia.
 */
export const MINT_MARK_NONE = 'NONE';

/** Stored value meaning "nobody has looked, or the coin is too worn to tell". */
export const MINT_MARK_UNKNOWN = 'UNKNOWN';

/**
 * What an unknown mint mark normalizes to. No album slot uses it, so an
 * unexamined coin never auto-fills a date/mint slot — it stays available for
 * manual assignment instead of silently claiming a slot it may not belong in.
 */
export const UNKNOWN_MINT_MARK = '?';

/**
 * Fold mint marks for matching: "no mint mark", "P" and Philadelphia all
 * collapse to ''. Everything else is trimmed and uppercased ("d" -> "D").
 *
 * Empty and null are treated as '' too, which is deliberately the *lenient*
 * reading. Before the sentinels existed, blank was the only way to record a
 * coin with no mint mark, so pre-sentinel rows are overwhelmingly Philadelphia
 * coins rather than unexamined ones. New entries can't be blank — the form
 * requires an explicit choice — so this leniency applies only to legacy data.
 */
export function normalizeMintMark(input: string | null | undefined): string {
  if (!input) return '';
  const mark = input.trim().toUpperCase();
  if (mark === 'P' || mark === MINT_MARK_NONE) return '';
  if (mark === MINT_MARK_UNKNOWN) return UNKNOWN_MINT_MARK;
  return mark;
}

/**
 * Whether the mint mark question has been answered for this coin — either with
 * a real mark or with one of the sentinels. Blank means unanswered.
 */
export function isMintMarkAnswered(input: string | null | undefined): boolean {
  return Boolean(input && input.trim());
}

const MINT_MARK_NONE_PHRASES = new Set(['none', 'no mark', 'no mint mark', 'not present', 'absent']);
const MINT_MARK_UNKNOWN_PHRASES = new Set([
  'unknown',
  'unclear',
  'illegible',
  'not visible',
  'indeterminate',
  'cannot tell',
]);

/**
 * Fold recognizer output into the stored vocabulary. The model is asked for
 * "NONE"/"UNKNOWN" but writes prose when it drifts, and older deployments of
 * the edge function return null for both cases — null stays null here so a
 * version-skewed response is left unanswered rather than mislabelled.
 */
export function canonicalizeMintMark(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = normalizeText(input);
  if (!text) return null;
  if (MINT_MARK_NONE_PHRASES.has(text)) return MINT_MARK_NONE;
  if (MINT_MARK_UNKNOWN_PHRASES.has(text)) return MINT_MARK_UNKNOWN;
  return input.trim().toUpperCase().slice(0, 3);
}

/**
 * The letter(s) actually stamped on the coin, or null when there are none, the
 * question is unanswered, or nobody could tell. For compact lines that only
 * have room for a real mark ("1917 · D").
 */
export function mintMarkLetter(input: string | null | undefined): string | null {
  if (!isMintMarkAnswered(input)) return null;
  const mark = input!.trim().toUpperCase();
  return mark === MINT_MARK_NONE || mark === MINT_MARK_UNKNOWN ? null : mark;
}

/**
 * Human-readable mint mark. Returns null when there is nothing worth showing,
 * so callers can drop the row entirely rather than print "NONE".
 */
export function formatMintMark(input: string | null | undefined): string | null {
  if (!isMintMarkAnswered(input)) return null;
  const mark = input!.trim().toUpperCase();
  if (mark === MINT_MARK_NONE) return 'No mint mark';
  if (mark === MINT_MARK_UNKNOWN) return 'Unknown';
  return mark;
}
