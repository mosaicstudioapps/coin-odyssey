# Seeds

Not migrations. Nothing here runs automatically — these are one-shot scripts,
applied by hand, and re-running one duplicates its rows.

## demo-account.sql

Fills out `demo@mosaicstudioapps.com`, the account given to Apple App Review
and Google Play review and the account the store screenshots are shot on.

Applied 2026-08-23. State afterwards:

| | |
|---|---|
| Coins | 107 |
| Date range | 1883 – 2024 (142 years) |
| Countries | 33 |
| With a purchase price | 68 of 107 |
| Dated before the chart's 12-month window | 34 |
| Coins with photos | **0** |

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

### Known gap

No coin on this account has a photo, so every disc in the app renders as a
placeholder. Photographing coins onto the demo account is manual work that
has to happen on a device.
