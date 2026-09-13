# Surface

## Mobile screens

**Auth**
- **Sign in / Sign up:** email and password only. Apple sign-in was removed for 1.0.
- **Forgot password:** sends a reset email.
- **Reset password:** opened by a deep link.

**Tabs**
- **Dashboard:** "years of history" headline, coins added in the last 12 months, country coverage (links to Map), scan shortcut, recently added.
- **Map:** world coverage with per-country counts, earliest and latest years, and "next frontiers".
- **Scan capture:** camera shots of front and back.
- **Scan pipeline:**
  - Four stages: identify, grade, story, catalog. The coin auto-saves at the end.
  - Failure states: retry, unrecognized (offers manual add), rate limit, quota reached, and save retry.
- **Scan review:** result with per-field confidence badges, the story, and condition notes. Can edit or delete. Shows "Fills a slot in {album}" when the coin matched an album slot.
- **Collection list:** filter by country, year, value, or grade; sort by date, value, year, or name. Unsynced offline coins are pinned with a PENDING chip.
- **Coin detail:** fields, the story (can be generated if missing), notes, photo lightbox, edit, delete.
- **Add / Edit coin:** a shared form with denomination, category, and mint-mark pickers.
- **Albums list and detail:** slot grids with progress. The assign sheet can assign a coin, view it, choose another, or mark "not this coin". The World album is read-only.
- **Settings:** email, sync status, display currency (changes the symbol only, no conversion), privacy and terms links, sign out, delete account.

## Edge functions

All three take the user's JWT.

- **`recognize-coin`:** receives two base64 images. Checks size, consumes quota, and calls Claude Opus 5. Returns denomination, year, country, currency, face value, mint mark, design, category, composition, confidence, grade, grade confidence, notes, and history. Business errors return HTTP 200 with a code: `quota_exceeded`, `rate_limit`, `payload_too_large`, or `service_unavailable`.
- **`coin-story`:** writes the "About this coin" text from typed fields using Haiku 4.5. It does not use scan quota.
- **`delete-account`:** removes all of the user's rows, photos, and auth user.

## Other runtime

- **RPC:** `consume_scan` and `refund_scan`, callable by the service role only.
- **Realtime:** the app subscribes to `coins` changes for refresh across devices.
- **Offline sync:** coins created offline are queued on the device and replayed on reconnect.

## Tooling

- **Eval (`eval/coin-recognition`):**
  - `run.ts` calls the deployed recognizer as the demo account. It scores year, mint mark, denomination, country, design, category, `all_correct`, and `honest` (fails on a confidently wrong answer). It spends real money and demo-account quota.
  - `regrade.ts` re-scores saved traces.
  - `ingest.mjs` pairs and resizes photos.
- **CI:** GitHub Actions runs the mobile typecheck and jest. Nothing covers the edge functions or the web app.

## Web app (paused, not released; parity with mobile planned)

- **Pages:** dashboard, collection, goals, achievements, analysis, spreadsheet import, settings, auth, contact, privacy, terms, cookies.
- **Predates the mobile pivot:** still has pricing and PCGS services. It has no scan pipeline, albums, map, or offline mode.
- **API:** `POST /api/contact` writes to `contact_messages`.
- **Auth middleware:** only guards `/dashboard`.
