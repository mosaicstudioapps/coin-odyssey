// Grading for the coin-recognition eval.
//
// Every field here is checked programmatically. The output space is closed —
// a year is a number, a mint mark comes from a small set, a denomination and a
// country both have canonical forms — so a judge would add cost and variance
// without measuring anything a comparison can't. The one genuinely open field,
// `history`, is deliberately not graded; see NOT GRADED below.
//
// Comparisons run through the SAME normalizers the app uses to store a coin, so
// a "pass" here means the app would have stored the right thing — not merely
// that two strings looked alike.

import {
  canonicalizeMintMark,
  normalizeDenomination,
  normalizeText,
  resolveCountryCode,
  MINT_MARK_NONE,
  MINT_MARK_UNKNOWN,
} from '@coin-collecting/shared';

export interface Expected {
  year: number | null;
  mintMark: string | null;
  denomination: string | null;
  country: string | null;
  design: string | null;
  category: string | null;
}

export interface Recognition {
  year: number | null;
  mintMark: string | null;
  denomination: string | null;
  country: string | null;
  design?: string | null;
  category?: string | null;
  confidence: string;
  grade: string | null;
}

/** null in `expected` means "we have not verified this" — scored as skipped, never as a failure. */
type Score = 1 | 0 | null;

function scoreYear(got: number | null, want: number | null): Score {
  if (want == null) return null;
  return got === want ? 1 : 0;
}

function scoreMintMark(got: string | null, want: string | null): Score {
  if (want == null) return null;
  const g = canonicalizeMintMark(got);
  const w = canonicalizeMintMark(want);
  // UNKNOWN is not a wrong answer, but it is not a right one either — the coin
  // has a definite mint mark and the model failed to read it. Scored 0 so that
  // "gave up" and "guessed wrong" are not silently averaged together; the
  // `honest` metric below is what separates them.
  return g === w ? 1 : 0;
}

function scoreDenomination(got: string | null, want: string | null): Score {
  if (want == null) return null;
  return normalizeDenomination(got) === normalizeDenomination(want) ? 1 : 0;
}

function scoreCountry(got: string | null, want: string | null): Score {
  if (want == null) return null;
  const g = resolveCountryCode(got);
  const w = resolveCountryCode(want);
  // Fall back to normalized text so a country outside the album table still
  // grades rather than silently passing.
  if (g && w) return g === w ? 1 : 0;
  return normalizeText(got) === normalizeText(want) ? 1 : 0;
}

function scoreDesign(got: string | null | undefined, want: string | null): Score {
  // A case with no series design (an ordinary circulating coin) still tests
  // something important: the model must NOT invent one. Expected null means
  // "must return null", which is why this is not skipped like the others.
  const g = normalizeText(got);
  const w = normalizeText(want);
  if (!w) return g === '' ? 1 : 0;
  if (!g) return 0;
  // Honoree names appear with and without titles and honorifics
  // ("Dr. Mary Edwards Walker" vs "Mary Edwards Walker"), so accept either
  // side containing the other rather than demanding an exact string.
  return g === w || g.includes(w) || w.includes(g) ? 1 : 0;
}

function scoreCategory(got: string | null | undefined, want: string | null): Score {
  if (want == null) return null;
  return normalizeText(got) === normalizeText(want) ? 1 : 0;
}

export function grade(got: Recognition, want: Expected) {
  const fields = {
    year: scoreYear(got.year, want.year),
    mint_mark: scoreMintMark(got.mintMark, want.mintMark),
    denomination: scoreDenomination(got.denomination, want.denomination),
    country: scoreCountry(got.country, want.country),
    design: scoreDesign(got.design, want.design),
    category: scoreCategory(got.category, want.category),
  };

  const scored = Object.values(fields).filter((v): v is 1 | 0 => v !== null);
  const wrong = scored.filter((v) => v === 0).length;

  // The headline. A coin catalogued with the wrong year or the wrong
  // denomination is wrong to the collector no matter how many other fields
  // were right, so this is all-or-nothing rather than an average.
  const all_correct = scored.length > 0 && wrong === 0 ? 1 : 0;

  // The calibration measure, and the reason this eval exists in its current
  // form: every failed scan so far still reported HIGH. A model that says
  // "low" on a coin it got wrong is behaving correctly and should not be
  // penalised the same way as one that is confidently wrong.
  const claimedHigh = normalizeText(got.confidence) === 'high';
  const honest = claimedHigh && wrong > 0 ? 0 : 1;

  // Answered rather than declined. Separates "read it wrong" from "gave up",
  // which the pass rate alone cannot show.
  const declined =
    canonicalizeMintMark(got.mintMark) === MINT_MARK_UNKNOWN || got.year == null;

  return {
    grade: { all_correct, honest, ...fields },
    meta: { wrong_fields: wrong, scored_fields: scored.length, declined },
  };
}

// NOT GRADED, deliberately:
//   history  — factual accuracy of the generated story needs a judge, and the
//              product decision was to defer story accuracy past 1.0.
//   grade    — Sheldon grading from a photograph is approximate by nature and
//              two experts routinely disagree by several points. Our own gold
//              would be a guess, so scoring it would measure noise. The runner
//              records what the model said so it can be reviewed by eye.
//   notes /
//   composition — free text with many valid phrasings; not worth a judge yet.
export { MINT_MARK_NONE, MINT_MARK_UNKNOWN };
