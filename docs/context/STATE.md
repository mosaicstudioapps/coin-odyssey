# Current state

As of 2026-09-13. "(notes)" marks facts taken from project notes rather than code.

## Works end to end

- **Auth:** email sign-up and sign-in, password reset by deep link, account deletion.
- **Scan pipeline:** photo, identify, grade, story, auto-save, review. The 25-per-month quota refunds on failure.
- **Accuracy:** 90.5% all-fields-correct on a 21-coin eval (notes). Provisional, because the gold labels are unverified.
- **Manual entry:** add and edit with pickers, AI stories for manual coins, filter and sort, delete.
- **Albums:** six albums with auto-matching and manual assignment. Four more (America the Beautiful, Morgan, Peace, Walking Liberty) sit on an unmerged `release/1.1` branch.
- **Dashboard and map.**
- **Offline and sync:** an offline create queue, plus Realtime refresh across devices.
- **Mobile checks:** typecheck is clean and all 138 jest tests pass (7 suites).
- **Stores (confirmed 2026-09-13):** iOS 1.0 and Android 1.0 are both still under review, and neither is live. iOS is set to manual release. The EU and 17 other countries are excluded (notes).

## Not validated

- **Android:** no build has run on a real device or emulator (notes). iOS has been exercised through TestFlight.
- **Offline queue and Realtime** have not had a structured device test.
- **Queued offline photos** are cache files and are lost if the OS evicts the cache before sync.

## Half-built or dead

- **Unwired services:** goals, achievements, notifications, analytics, and geographic services exist, but no screen uses them. There are also dead components and an `_archive` screen folder.
- **Settings stubs:** "Theme" (light theme promised for v1.1) and "Default grade scale" do nothing.
- **Legacy tables:** pricing, sharing, goals, and consent tables remain (see DATA-MODEL.md).
- **Missing features:** no export, no Apple sign-in (the provider is disabled; service code is kept), no paid tier (the quota is the intended paywall boundary).
- **Web app:** development is paused and will resume to reach parity with mobile. It still reflects the pre-pivot product (pricing, goals, no scanning or albums).
- **Collection sharing:** not built and not planned.
- **Legacy coin data:** about 124 legacy coins need a backfill of category and denomination (notes).

## Risks

- **Confident wrong scans:** the recognizer's confidence does not track correctness. Guards only catch impossible years and mint marks.
- **Quota fails open** if the quota database call errors.
- **Single AI key:** one Anthropic key powers both AI features. A key outage on 2026-09-13 broke scanning and nothing alerted (notes).
- **Sentry quota:** expected offline errors report at error level and may exhaust the free tier.
- **Android follow-ups:** R8 minification is off (Play deadline Feb 2027), there are unused manifest permissions, and large screens are untested.

## Docs that disagree with code

- **Root README:** advertises market value estimates and Apple sign-in. The mobile README is pre-pivot.
- **Eval README:** says the quota default is 50; the code says 25.
- **Env example:** still lists a PCGS token.
- **Web deploy config:** builds the web app as a workspace, which it deliberately no longer is, so a deploy would likely fail. Web deployment is paused, and this needs fixing when work resumes.
