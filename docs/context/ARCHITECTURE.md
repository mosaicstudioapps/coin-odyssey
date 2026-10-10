# Architecture

## What it is

Coin Odyssey is an iOS and Android app for hobby coin collectors, published by Mosaic Studio LLC. A user photographs both sides of a coin. An AI model identifies it (country, denomination, year, mint mark, design, category), estimates a Sheldon grade, and writes a short "About this coin" history. The coin is then saved to the user's private collection. Coins can also be added by hand. The product is deliberately education-first and shows no market prices. Other features are series "albums" (digital checklists), a world-coverage map, and offline entry. There is one private collection per account. Collection sharing isn't built and isn't planned.

## Stack

- **Mobile app:** TypeScript, React Native 0.81 on Expo SDK 54, React 19, and React Navigation. Builds and store submission go through EAS.
- **Backend:** Supabase for Postgres with row-level security (RLS), email auth, a private photo bucket, Realtime, and three Deno edge functions. There is no custom server.
- **AI:** Anthropic Claude, called only from the edge functions, so the key stays server-side. Recognition uses Opus 5 and the text-only story uses Haiku 4.5.
- **Crash reporting:** Sentry.
- **Shared code:** `packages/shared`, an npm workspace consumed as raw TypeScript with no build step.
- **Web app (paused):** Next.js 15 with React 18. It is not released. The plan is to resume it and bring it to parity with mobile.

## Directory tree

```
mobile-app/             The product (Expo app)
  src/                  Screens, navigation, services (all backend calls), design system
  app-store-assets/     Store copy, screenshots, Play graphics
packages/shared/        Types, album/series data, normalization, scan guards
supabase/migrations/    Schema baseline + incremental migrations
supabase/functions/     recognize-coin, coin-story, delete-account
supabase/seeds/         Hand-applied demo-account seed
eval/coin-recognition/  Accuracy eval against the deployed recognizer
web-app/                Paused Next.js app (parity with mobile planned)
docs/                   Older notes and compliance guides, mostly pre-pivot
.github/workflows/      Mobile CI
```

## Entry points

- **App start:** the root component starts crash reporting, fonts, the image cache, monitors, and the offline-sync watcher.
- **Navigation:** signed-out users see the auth stack. Signed-in users see five tabs: Dashboard, Scan, Collection, Albums, Settings. A `coin-odyssey://` reset link opens a password-reset screen.
- **Server logic:** exists only in the edge functions and in RLS and database functions. The client does its CRUD directly against Supabase.

## Decisions that may surprise

- **No pricing, by design.** The `coins` table still carries valuation columns from an earlier product, but the app no longer writes them. Recognition returns face value only, and the dashboard headline is "years of history".
- **The web app must never be an npm workspace.** Its React 18 hoists to the root and black-screens the mobile app, which needs React 19. Any parity work has to keep the two React versions apart.
- **Albums have no tables.** Album definitions are static shared data. Slot fills are computed on the device by keyword, year, mint mark, and country matching. Manual assignments write tags into existing coin columns, and the sentinel `__none__` means "not this coin".
- **Scan quota is server-enforced.** The recognizer consumes one scan before calling the AI and refunds it on failure. If the quota call itself errors, the scan is allowed (fails open).
- **Payload budget.** Edge functions hang silently on request bodies above about 512 KB. The client shrinks both photos to a combined budget of about 350 KB.
- **Scan guards.** The model's confidence has not tracked correctness. Shared guards blank impossible years and mint marks the coin's country never used.
- **Mint mark sentinels.** Stored values include `NONE` and `UNKNOWN` alongside real letters. A legacy blank still counts as Philadelphia so older data keeps matching albums.
- **Realtime relies on RLS.** Coins link to a collection, not a user, so the subscription is scoped by RLS rather than a user filter.
- **Edge functions verify JWTs in their own code**, with platform-level `verify_jwt` turned off.
