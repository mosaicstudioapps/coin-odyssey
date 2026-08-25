# Seeds

Not migrations. Nothing here runs automatically — these are one-shot scripts,
applied by hand, and re-running one duplicates its rows.

## demo-account.sql

Fills out `demo@mosaicstudioapps.com`, the account given to Apple App Review
and Google Play review and the account the store screenshots are shot on.

Applied 2026-08-23. State afterwards:

| | |
|---|---|
| Coins | 107 at seed time, 111 now (see below) |
| Date range | 1883 – 2026 (144 years) |
| Countries | 33 |
| With a purchase price | 68 of 107 |
| Dated before the chart's 12-month window | 34 |
| Coins with photos | 4 (all from device scans) |

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

Four coins were added on 2026-08-25 by scanning real ones on a device, so the
account now holds **111** coins and is the only source of real photographs on
it. Three of them fill American Women Quarters slots — Otero-Warren, Kanakaʻole
and Pauli Murray — and because the fill ranking prefers a coin with a photo,
those three slots now show the real thing instead of a placeholder disc.

All four arrived with errors worth knowing about, since they are the clearest
evidence to date of how the recogniser fails: Kanakaʻole was recorded as a 2025
issue (it is 2023), Pauli Murray as a **Half Dollar** at $0.50, and the 2026
Semiquincentennial quarter was given an American Women Quarters story for a
programme that had already ended. Every one of those was reported at
`HIGH · 90`. The rows have been corrected by hand; the underlying recognition
problem has not been fixed.

### Known gap

The other 107 coins have no photographs, so their discs still render as
placeholders. Photographing coins onto the demo account is manual work that
has to happen on a device.
