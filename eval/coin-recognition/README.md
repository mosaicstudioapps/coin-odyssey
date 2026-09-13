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

The demo login is read from `EVAL_DEMO_EMAIL` and `EVAL_DEMO_PASSWORD`, either
exported in the shell or set in `mobile-app/.env` (gitignored). Never write it
into source: this repo is public. The names are deliberately not
`EXPO_PUBLIC_*`, because Expo inlines those into the app bundle.

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
`design` follows the same rule, and gold names one only where an honoree or
issue varies within a programme -- American Women, State and Park quarters,
Westward Journey. That is the question Albums asks. Naming the standard reverse
type of an ordinary coin ("Union Shield", "Monticello") is neither right nor
wrong for our purposes and is not scored.

## Adding cases

Shoot obverse then reverse for each coin, in order, into any folder. Then:

```bash
node eval/coin-recognition/ingest.mjs --check "C:/path/to/photos"
node eval/coin-recognition/ingest.mjs --from  "C:/path/to/photos"
# check images/pairs.html, fill in labels.csv from the coins
node eval/coin-recognition/ingest.mjs --build
```

`--check` writes nothing — it just lists the format and pixel dimensions of
every photo in a folder and names the transfer setting behind anything wrong.
Worth running on two photographs before moving fifty, because format and
resolution are decided by the transfer rather than the camera: HEIC stops the
run outright, and a resampled JPEG runs perfectly well while quietly making the
1568px comparison underivable.

Ingest pairs the photos in shooting order, resizes them to the width the app
actually sends, and writes a `labels.csv` to fill in plus a `pairs.html` contact
sheet so a mis-ordered pair is caught by eye rather than by a mystifying score.
`--width` re-derives the same photographs at another size, so image resolution
can itself be tested without re-shooting.

It never fills in a label. See the shot and labelling guide in the vault:
`coin-odyssey/eval-coin-photo-guide.md`.

Hand-written cases still work — the format is:

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

## Re-scoring without re-running

Gold gets corrected. When it does, re-score the run you already have instead of
spending the allowance again:

```bash
npx tsx eval/coin-recognition/regrade.ts --variant baseline
```

The model's answers are on disk in `traces/`, so a gold fix does not need fresh
model output — and mixing the two into one number would make it impossible to
say which moved. It writes `results.regraded.jsonl` and leaves `results.jsonl`
alone, so the run as first scored stays auditable.

## Two decisions, settled 2026-09-07

**Sheldon `grade` is not scored, and won't be.** Professional graders disagree
by several points on the same coin from photographs, so our gold would be one
person's guess. A metric whose gold is noise measures noise — and worse, it
would drag `all_correct` around and mask real movement in the fields that do
have answers. It stays recorded in the traces for review by eye. If we ever want
it, the honest form is a tolerance band against professionally slabbed coins,
not free-form gold, and that is a post-1.0 project. `history` is out for the
related reason that it needs a judge.

**Wrong at low confidence still counts as `honest`.** The accuracy cost is
already charged in full to `all_correct`; charging it a second time here would
make `honest` a noisier copy of that metric, carrying no independent
information. It would also push in exactly the wrong direction — a model that
says "I'm not sure" gives the user something to act on (rescan, better light),
while a confident wrong answer files a wrong coin into the collection with
nothing to flag it.

Read together the pair separates *wrong and knew it* from *wrong and sure*. Only
the second one reaches the user as a bad catalogue entry, and it is the failure
we have actually seen: every bad scan so far still reported `HIGH`.

## Guardrails

The runner refuses to start if `run.ts` or `grade.ts` changed since the last
`--approve-harness`, so a mid-experiment edit cannot be mistaken for a model
improvement. Failed calls go to `errors.jsonl`, never `results.jsonl` — a
plumbing failure must not be scored as a model failure, and must not occupy a
`(case, rep)` slot that resume would then skip forever.
