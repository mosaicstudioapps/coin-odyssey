# Current state

As of 2026-10-15. "(notes)" marks facts taken from project notes rather than code.

## Works end to end

- **Auth:** email sign-up and sign-in, password reset by deep link, account deletion.
- **Scan pipeline:** photo, identify, grade, story, auto-save, review. The 25-per-month quota refunds on failure.
- **Accuracy:** 90.5% all-fields-correct on a 21-coin eval (notes). Only 13 of the 21 gold labels are checked against the coin, so treat it as provisional.
- **Manual entry:** add and edit with pickers, AI stories for manual coins, filter and sort, delete.
- **Albums:** ten albums with auto-matching and manual assignment.
- **Achievements and light theme:** shipped in 1.1.
- **Dashboard and map.**
- **Offline and sync:** an offline create queue, plus Realtime refresh across devices.
- **Checks:** mobile and web typecheck clean; 277 jest tests pass (14 suites), covering shared code too.
- **Stores (2026-10-15, notes):** 1.1 is live on both stores (iOS build 17, Android versionCode 6; tag `v1.1.0`). The EU and 17 other countries are excluded.

## Not validated

- **Android:** no build has run on a real device or emulator (notes). iOS has been exercised through TestFlight.
- **Offline queue and Realtime** have not had a structured device test.
- **Queued offline photos** are cache files and are lost if the OS evicts the cache before sync.

## Half-built or dead

- **Unwired services:** goals, notifications, analytics, and geographic services exist, but no screen uses them. There are also dead components and an `_archive` screen folder.
- **Settings stub:** "Default grade scale" does nothing.
- **Legacy tables:** pricing, sharing, goals, and consent tables remain (see DATA-MODEL.md).
- **Missing features:** no export, no Apple sign-in (the provider is disabled; service code is kept), no paid tier (the quota is the intended paywall boundary).
- **Web app (`release/web-1.0`):** Phases 0–3 done: sign-in, design system, shared logic, and the collection pages. Dashboard, scan, albums, achievements, and settings to come. Not yet tried against real data.
- **Collection sharing:** not built and not planned.
- **Legacy coin data:** about 124 old coins need category and denomination backfilled (notes).

## Unreleased (on `release/web-1.0`, ships with the next mobile release)

- "Silver" and "Gold" chips and disc colors go by metal, not price. Scans save `composition` (column not yet in production). Clearing a field on edit now saves.

## Risks

- **Confident wrong scans:** the recognizer's confidence does not track correctness. Guards only catch impossible years and mint marks.
- **Quota fails open** if the quota database call errors.
- **Single AI key:** one Anthropic key powers both AI features. A key outage on 2026-09-13 broke scanning and nothing alerted (notes).
- **Android follow-ups:** R8 minification is off (Play deadline Feb 2027), there are unused manifest permissions, and large screens are untested.

## Docs that disagree with code

- **Root README:** advertises market value estimates and Apple sign-in. The mobile README is pre-pivot.
- **Eval README:** says the quota default is 50; the code says 25.
- **Env example:** still lists a PCGS token.
