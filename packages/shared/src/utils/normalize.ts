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
 * Fold mint marks for matching: null/empty/"P" all mean Philadelphia -> ''.
 * Everything else is trimmed and uppercased ("d" -> "D").
 */
export function normalizeMintMark(input: string | null | undefined): string {
  if (!input) return '';
  const mark = input.trim().toUpperCase();
  return mark === 'P' ? '' : mark;
}
