# Surface

## Mobile screens

**Auth**
- **Sign in / Sign up:** email and password only. Apple sign-in was removed for 1.0.
- **Forgot password:** sends a reset email.
- **Reset password:** opened by a deep link.

**Tabs**
- **Dashboard:** years of history, 12-month growth, coverage (to Map), achievements card, scan shortcut, recently added.
- **Map:** world coverage with per-country counts, earliest and latest years, and "next frontiers".
- **Scan capture:** camera shots of front and back; scans left this month (unreleased).
- **Scan pipeline:**
  - Four stages: identify, grade, story, catalog. The coin auto-saves at the end.
  - Failure states: retry, unrecognized (offers manual add), rate limit, quota reached, and save retry.
- **Scan review:** result with per-field confidence badges, the story, and condition notes. "Check these" confirms year and mint and re-files the coin. Shows "Fills a slot in {album}".
- **Collection list:** filter by country, year, value, or grade; sort by date, value, year, or name. Unsynced offline coins are pinned with a PENDING chip.
- **Coin detail:** fields, the story (can be generated if missing), condition notes, notes, photo lightbox, edit, delete.
- **Achievements:** 28 badges in six groups with progress and unlock dates; each new unlock gets a celebration sheet.
- **Add / Edit coin:** a shared form with denomination, category, and mint-mark pickers.
- **Albums list and detail:** slot grids with progress. The assign sheet can assign a coin, view it, choose another, or mark "not this coin". The World album is read-only. Want list (share as text). Import/export screen in the Collection stack.
- **Settings:** email, sync status, theme (System, Light, Dark; applies live), display currency (changes the symbol only, no conversion), privacy and terms links, sign out, delete account.

## Edge functions

All three take the user's JWT.

- **`recognize-coin`:** receives two base64 images. Checks size, consumes quota, and calls Claude Opus 5. Returns identity fields (denomination, year, country, mint mark, design, category), face value, composition, confidence, grade, condition notes, and history. Business errors return HTTP 200 with a code: `quota_exceeded`, `rate_limit`, `payload_too_large`, or `service_unavailable`.
- **`coin-story`:** writes the "About this coin" text from typed fields using Haiku 4.5. It does not use scan quota.
- **`delete-account`:** removes all of the user's rows, photos, and auth user.
- **`scan-allowance`** (deployed 2026-10-22): read-only; this month's scans used and the limit.

## Other runtime

- **RPC:** `consume_scan` and `refund_scan`, callable by the service role only.
- **Realtime:** the app subscribes to `coins` changes for refresh across devices.
- **Offline sync:** coins created offline are queued on the device and replayed on reconnect.

## Tooling

- **Eval (`eval/coin-recognition`):**
  - `run.ts` calls the deployed recognizer as the demo account and scores each field, `all_correct`, and `honest` (fails on a confident wrong answer). It costs real money and demo quota.
  - `regrade.ts` re-scores saved traces.
  - `ingest.mjs` pairs and resizes photos.
- **CI:** mobile typecheck and jest; web typecheck and build; a single-React check in both. Nothing covers the edge functions.

## Web app (in progress, not released)

- **Built so far:** auth (restyled; sign-up has its own page), settings, the shell (desktop sidebar, phone tabs), collection (grid, search, filters, detail, add, edit), scan (picked, dropped, or webcam photos), dashboard, map, albums with a slot panel, achievements, CSV import and export, 404 and error pages. Public: landing page, 17 printable `/checklists`, sitemap, share images, Smart App Banner. Both themes. `/design` is a dev-only component sheet.
- **Auth:** `@supabase/ssr` with middleware that guards every app section.
- **Legal, contact:** redirect to the studio site.
