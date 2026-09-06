# Coin recognition accuracy eval

Measures how often the recogniser gets a coin right, so a change to the model
or the prompt can be judged by a number instead of an impression.

```bash
npx tsx eval/coin-recognition/run.ts --variant baseline --reps 2 --approve-harness
node <skill>/shared/evals/report/build-report-lite.mjs .claude/hillclimb/coin-recognition/
```

The runner calls the **deployed** `recognize-coin` function over HTTP, exactly as
the app does, signing in as the demo account. The Anthropic key stays
server-side — the eval never needs it.

## Two things to know before running

**It spends money and quota.** One call per case per rep, billed to the
Anthropic account behind the edge function. It also consumes the demo account's
monthly scan allowance, which is **50 by default** — so 25 cases x 2 reps
exhausts it exactly. Raise `SCAN_MONTHLY_LIMIT` on the function, or drop to
`--reps 1`, before running a large set.

**Gold has to be real.** Every case carries `verified: false` until a human has
confirmed the answer against the physical coin. The seed cases came from earlier
scans, and at least one of them (the Walker `D`) was our assumption rather than
something read off the coin. Unverified gold produces a confident, wrong number —
the most expensive kind.

Where a field genuinely isn't known, set it to `null`. Null is *skipped*, not
failed, so a partly-verified case is still useful and never invents a penalty.
The exception is `design`, where `null` means "the model must not invent one" and
is graded.

## Adding cases

See the shot guide in the vault: `coin-odyssey/eval-coin-photo-guide.md`.

Photographs go in `images/`, named as the case references them. Then:

```json
{
  "id": "gb-penny-1967",
  "obverse": "images/gb-penny-1967-obv.jpg",
  "reverse": "images/gb-penny-1967-rev.jpg",
  "tags": ["world", "worn"],
  "expected": {
    "year": 1967, "mintMark": null, "denomination": "Penny",
    "country": "United Kingdom", "design": null, "category": "circulating"
  },
  "goldSource": "read off the coin under a loupe",
  "verified": true
}
```

`tags[0]` groups the report; the rest render as chips.

## What is scored

`all_correct` is the headline: every verified field right, all-or-nothing,
because a coin catalogued with the wrong year is wrong to the collector however
many other fields were fine.

`honest` is the one to watch alongside it. It fails when the model claims `high`
confidence *and* gets something wrong. Every bad scan we have seen so far still
reported `HIGH`, and a pass rate alone cannot show that.

Then `year`, `mint_mark`, `denomination`, `country`, `design`, `category`
individually, so a regression points at a field rather than a vibe.

Deliberately **not** scored — `grade` (photo grading is approximate and two
experts disagree by several points, so our gold would be a guess and we would be
measuring noise), and `history` (needs a judge; story accuracy is a post-1.0
decision). Both are recorded and can be reviewed by eye in the traces.

## Guardrails

The runner refuses to start if `run.ts` or `grade.ts` changed since the last
`--approve-harness`, so a mid-experiment edit cannot be mistaken for a model
improvement. Failed calls go to `errors.jsonl`, never `results.jsonl` — a
plumbing failure must not be scored as a model failure, and must not occupy a
`(case, rep)` slot that resume would then skip forever.
