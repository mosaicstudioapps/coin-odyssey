/**
 * Oracle / null check for the grader.
 *
 * A grader that cannot tell a perfect answer from an empty one cannot tell two
 * models apart either, and that failure is invisible in the score — it just
 * shows up as "the change didn't help". Cheap to run, so run it before spending
 * anything: `npx tsx eval/coin-recognition/grade.check.ts`
 */

import { grade } from './grade.ts';

/** Gold for the Walker quarter. mintMark is null — nobody has read it off the coin. */
const walker = {
  year: 2024,
  mintMark: null,
  denomination: 'Quarter Dollar',
  country: 'United States',
  design: 'Dr. Mary Edwards Walker',
  category: 'commemorative',
};

const oracle = grade(
  { ...walker, mintMark: 'D', confidence: 'high', grade: 'AU-55' },
  walker
);

const empty = grade(
  {
    year: null, mintMark: null, denomination: null, country: null,
    design: null, category: null, confidence: 'high', grade: null,
  },
  walker
);

/** What Haiku actually returned for this coin. */
const haiku = grade(
  {
    year: 2034, mintMark: 'F', denomination: 'Quarter Dollar',
    country: 'United States', design: 'Dr. Mary Edwards Walker',
    category: 'commemorative', confidence: 'high', grade: 'PR-67',
  },
  walker
);

/** The same errors, but declared as uncertain rather than asserted. */
const humble = grade(
  {
    year: 2034, mintMark: 'F', denomination: 'Quarter Dollar',
    country: 'United States', design: 'Dr. Mary Edwards Walker',
    category: 'commemorative', confidence: 'low', grade: 'PR-67',
  },
  walker
);

/** An ordinary coin where the model invented a series design. */
const invented = grade(
  {
    year: 2026, mintMark: 'D', denomination: 'Quarter Dollar',
    country: 'United States', design: 'Yellowstone National Park',
    category: 'circulating', confidence: 'high', grade: 'MS-67',
  },
  {
    year: 2026, mintMark: 'D', denomination: 'Quarter Dollar',
    country: 'United States', design: null, category: 'circulating',
  }
);

for (const [name, r] of Object.entries({ oracle, empty, haiku, humble, invented })) {
  console.log(name.padEnd(9), JSON.stringify(r.grade));
}

let failed = false;
const check = (ok: boolean, msg: string) => {
  if (!ok) { console.error('FAIL: ' + msg); failed = true; }
};

check(oracle.grade.all_correct === 1, 'a perfect answer must score all_correct');
check(oracle.grade.honest === 1, 'correct at high confidence is honest');
check(empty.grade.all_correct === 0, 'an empty output must not pass');
check(haiku.grade.all_correct === 0, "the real Haiku answer must fail");
check(haiku.grade.year === 0, '2034 must fail the year');
check(haiku.grade.honest === 0, 'wrong at high confidence must fail honest');
check(humble.grade.honest === 1, 'wrong at LOW confidence is honest — not penalised twice');
// Gold mintMark is null (never verified), so it must be skipped rather than
// scored — otherwise an unverified field silently becomes a permanent failure.
check(haiku.grade.mint_mark === null, 'unverified gold must be skipped, not failed');
check(invented.grade.design === 0, 'inventing a design where there is none must fail');

console.log(failed ? '\nGRADER CHECKS FAILED' : '\nall grader checks passed');
process.exit(failed ? 1 : 0);
