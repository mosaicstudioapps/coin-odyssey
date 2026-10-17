# Current state

As of 2026-10-17. "(notes)" marks facts taken from project notes rather than code.

## Works end to end

- **Auth:** email sign-up and sign-in, password reset by deep link, account deletion.
- **Scan pipeline:** photo, identify, grade, story, auto-save, review. The 25-per-month quota refunds on failure.
- **Accuracy:** 90.5% all-fields-correct on a 21-coin eval (notes). Only 13 of the 21 gold labels are checked against the coin, so treat it as provisional.
- **Manual entry:** add and edit with pickers, AI stories for manual coins, filter and sort, delete.
- **Albums:** ten albums with auto-matching and manual assignment.
- **Achievements and light theme:** shipped in 1.1.
- **Dashboard and map.**
- **Offline and sync:** an offline create queue, plus Realtime refresh across devices.
- **Checks:** mobile and web typecheck clean; 321 jest tests pass (18 suites), covering shared code too.
- **Stores (2026-10-15, notes):** 1.1 is live on both stores (iOS build 17, Android versionCode 6; tag `v1.1.0`). The EU and 17 other countries are excluded.

## Not validated

- **Android:** no build has run on a real device or emulator (notes). iOS has been exercised through TestFlight.
- **Offline queue and Realtime** have not had a structured device test.
- **Queued offline photos** are cache files and are lost if the OS evicts the cache before sync.

## Half-built or dead

- **Unwired services:** goals, notifications, analytics, and geographic services have no screen. Dead components and an `_archive` folder remain.
- **Settings stub:** "Default grade scale" does nothing.
- **Legacy tables:** pricing, sharing, goals, and consent tables remain (see DATA-MODEL.md).
- **Missing features:** no export, no Apple sign-in (the provider is disabled; service code is kept), no paid tier (the quota is the intended paywall boundary).
- **Web app (`release/web-1.0`):** Phases 0–6 done (through settings and auth). Not yet tried end to end.
- **Collection sharing:** not built and not planned.
- **Legacy coin data:** ~124 old coins need category and denomination (notes).

## Unreleased (on `release/web-1.0`, ships with the next mobile release)

- Silver/Gold chips and disc colors go by metal. Scans save `composition` (column live 2026-10-17). Clearing a field on edit saves.

## Risks

- **Confident wrong scans:** the recognizer's confidence does not track correctness. Guards only catch impossible years and mint marks.
- **Quota fails open** if its database call errors.
- **Single AI key** powers both AI features; a 2026-09-13 outage broke scanning unalerted (notes).
- **Android follow-ups:** R8 minification is off (Play deadline Feb 2027), there are unused manifest permissions, and large screens are untested.

## Docs that disagree with code

- **READMEs:** the root one advertises market values and Apple sign-in; the mobile one is pre-pivot.
- **Eval README:** says the quota default is 50; the code says 25.
- **Env example:** lists a PCGS token.
