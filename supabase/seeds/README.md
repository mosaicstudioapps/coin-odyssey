# Seeds

Not migrations. Nothing here runs automatically — these are one-shot scripts,
applied by hand, and re-running one duplicates its rows.

## demo-account.sql

Fills out `demo@mosaicstudioapps.com`, the account given to Apple App Review
and Google Play review and the account the store screenshots are shot on.

Applied 2026-08-23. State afterwards:

| | |
|---|---|
| Coins | 107 at seed time, 112 now (see below) |
| Date range | 1883 – 2026 (144 years) |
| Countries | 33 |
| With a purchase price | 68 of 107 |
| Dated before the chart's 12-month window | 34 |
| Coins with photos | 5 (all from device scans) |

Album fill, computed by running the real `albumService` heuristics over the
live account rather than by assertion:

| Album | Filled |
|---|---|
| American Women Quarters | 14 / 20 (70%) |
| 50 State Quarters | 22 / 50 (44%) |
| Lincoln Cents · Wheat | 16 / 140 (11%) |
| Lincoln Cents · Memorial | 8 / 104 (8%) |
| Lincoln Cents · Shield | 6 / 42 (14%) |
| World Coins | 33 / 195 (17%) |

Every one of those fills came from the heuristics — `series_id` and
`specific_coin_id` are null on all 107 rows, and nothing went unmatched. That
is worth keeping true if the seed is ever edited: it means the demo account
doubles as a live check on the album matcher, and a coin that stops matching
after a change to the matching rules will show up here as a hole.

### Since the seed ran

Five coins were added on 2026-08-25 by scanning real ones on a device, so the
account now holds **112** coins and is the only source of real photographs on
it. Four of them fill American Women Quarters slots — Otero-Warren, Kanakaʻole,
Pauli Murray and Mary Edwards Walker — and because the fill ranking prefers a
coin with a photo, those four slots now show the real thing instead of a
placeholder disc.

Every one arrived with errors, which makes this the clearest evidence to date of
how the recogniser fails. Kanakaʻole was recorded as a 2025 issue (it is 2023),
Pauli Murray as a **Half Dollar** at $0.50, and the 2026 Semiquincentennial
quarter was given an American Women Quarters story for a programme that had
already ended. The Mary Edwards Walker scan was the worst of them: year **2034**
(it is 2024), mint mark **F** (not a US mint), and a proof grade of **PR-67** on
a coin photographed loose on a table. That photo was poorly lit, which plausibly
explains the date, but not a mint mark that does not exist and not a strike-type
call. All of them were reported at `HIGH · 90`, so the confidence figure is not
tracking correctness or image quality.

The rows have been corrected by hand; the underlying recognition problem has
not been fixed. Note that the corrected Walker row is the *second* Walker coin
on the account — the seed already contained a 2024/P at MS-64 — so the scanned
one was set to mint mark **D** to read as a distinct piece. Its mint mark was
never legible in the photograph, so `D` is an assumption, not a reading.

### Known gap

The other 107 coins have no photographs, so their discs still render as
placeholders. Photographing coins onto the demo account is manual work that
has to happen on a device.
