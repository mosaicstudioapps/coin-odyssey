# Coin Odyssey web

The web version of Coin Odyssey: the same collection, scans, albums, and badges
as the iOS and Android app, laid out for a desktop, plus public checklist pages
for search. Next.js 15 (App Router) on React 19.1, against the same Supabase
project as the mobile app.

## Run it

From the repository root (the web app is an npm workspace):

```bash
npm install
cp web-app/.env.example web-app/.env.local   # fill in the two Supabase values
npm run dev --workspace=web-app              # http://localhost:3000
```

The dev server talks to whichever Supabase project `.env.local` names. If that
is production, anything you add or delete is real.

## Layout

- `src/app/(public)/`: the landing page and `/checklists`, open to everyone and pre-rendered.
- `src/app/(authenticated)/`: the signed-in app (dashboard, scan, collection, albums, achievements, map, settings). `src/middleware.ts` keeps signed-out visitors out.
- `src/app/auth/`: sign in, sign up, forgot and reset password, and the email-link callback.
- `src/lib/`: data access (`coins.ts`, `scan.ts`, `story.ts`, `achievements.tsx`) over the shared rules.
- `src/components/co/`: the design system, matching the mobile components.

Almost all logic lives in `packages/shared` (album fills, achievements, scan
stages, form and CSV rules, colors), so mobile and web behave the same. Keep
it that way: a new rule goes in shared, and each app adds only screens.

## Checks

```bash
npx tsc --noEmit -p web-app
npm run lint --workspace=web-app
npm run build --workspace=web-app
node scripts/check-single-react.mjs   # web and mobile must share one React
```

CI runs these on every push (`.github/workflows/web-ci.yml`).

## Deploying

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).
