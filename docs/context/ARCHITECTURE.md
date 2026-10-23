# Architecture

## What it is

Coin Odyssey is an iOS and Android app for hobby coin collectors, published by Mosaic Studio LLC. A user photographs both sides of a coin. An AI model identifies it (country, denomination, year, mint mark, design), estimates a Sheldon grade, and writes a short "About this coin" history. The coin is saved to the user's private collection; coins can also be added by hand. The product is deliberately education-first and shows no market prices. Other features: series "albums" (digital checklists), achievements, a world map, and offline entry. One private collection per account; sharing isn't built or planned.

## Stack

- **Mobile app:** TypeScript, React Native 0.81 on Expo SDK 54, React 19, and React Navigation. Builds and store submission go through EAS.
- **Backend:** Supabase for Postgres with row-level security (RLS), email auth, a private photo bucket, Realtime, and three Deno edge functions. There is no custom server.
- **AI:** Anthropic Claude, called only from the edge functions, so the key stays server-side. Recognition uses Opus 5 and the text-only story uses Haiku 4.5.
- **Crash reporting:** Sentry.
- **Shared code:** `packages/shared`, raw TypeScript with no build step. It holds every rule both apps need (album fills, achievements, filters, stats, coin rows, scan stages, story, auth, and CSV rules, tokens); each app adds only screens and storage.
- **Web app (`release/web-1.0`, unreleased):** Next.js 15.5, React 19.1, matching mobile.

## Directory tree

```
mobile-app/             The product (Expo app)
  src/                  Screens, navigation, services (all backend calls), design system
  app-store-assets/     Store copy, screenshots, Play graphics
packages/shared/        Types, data, design tokens, and all app logic
supabase/migrations/    Schema baseline + incremental migrations
supabase/functions/     recognize-coin, coin-story, delete-account, scan-allowance
supabase/seeds/         Hand-applied demo-account seed
eval/coin-recognition/  Accuracy eval against the deployed recognizer
web-app/                Next.js web app
docs/                   Older notes and compliance guides, mostly pre-pivot
.github/workflows/      Mobile and web CI
```

## Entry points

- **App start:** crash reporting, fonts, image cache, monitors, offline sync.
- **Navigation:** signed-out users see the auth stack. Signed-in users see five tabs: Dashboard, Scan, Collection, Albums, Settings. A `coin-odyssey://` reset link opens a password-reset screen.
- **Server logic:** only in edge functions, RLS, and database functions; clients do CRUD directly.

## Decisions that may surprise

- **No pricing, by design.** The `coins` table keeps old valuation columns, but the app no longer writes them. Recognition returns face value only, and the dashboard headline is "years of history".
- **Both apps pin the exact same React.** Two versions in one install black-screened mobile once. `scripts/check-single-react.mjs` fails CI if that recurs.
- **Albums have no tables.** Album definitions are static shared data. Slot fills are computed on the device by keyword, year, mint mark, and country matching. Manual assignments write tags into existing coin columns, and the sentinel `__none__` means "not this coin".
- **Scan quota is server-enforced.** The recognizer consumes one scan before calling the AI and refunds it on failure. If the quota call itself errors, the scan is allowed (fails open).
- **Payload budget.** Edge functions hang silently above ~512 KB, so clients shrink both photos to ~350 KB total.
- **Scan guards.** The model's confidence has not tracked correctness. Shared guards blank impossible years and mint marks the coin's country never used.
- **Mint mark sentinels.** Stored values include `NONE` and `UNKNOWN` alongside real letters. A legacy blank still counts as Philadelphia so older data keeps matching albums.
- **Realtime relies on RLS:** coins link to a collection, not a user, so RLS scopes the subscription.
- **Edge functions check JWTs in code** (platform `verify_jwt` off).
