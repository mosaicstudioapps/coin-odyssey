# Launch checklist

Everything the code needs is in place; these are the account steps, in order.
Nothing secret belongs in this file or the repo: the two public Supabase values
go in Vercel's settings, never a service-role key.

## 1. Domain

- [x] Buy the domain: `coinodyssey.app`, at Cloudflare (2026-10-29). Cloudflare runs its DNS: add Vercel's records there as **DNS only** (grey cloud), not proxied.

## 2. Vercel

Done 2026-10-29: project `coin-odyssey` on the Mosaic Studio team (Hobby plan, which is fine while the site makes no money; Pro once it does). Live at https://coinodyssey.app, with `www` and http redirecting there.

- [x] New project from the GitHub repo. **Root directory: `web-app`.** Framework: Next.js. `vercel.json` already installs from the repo root (the app is a workspace) and skips builds when nothing web-related changed.
- [x] Production branch: `release/1.2` (it carries all the web work) until it merges into `main`. **Change it to `main` when 1.2 merges.**
- [x] Environment variables (Production, Preview, and Development):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` = `https://<domain>` (sitemap, canonical links, share images)
- [x] Settings → Analytics → enable **Web Analytics** (cookie-free; the app already includes it).
- [x] Settings → Domains → `coinodyssey.app` and `www` (308 to the apex). Cloudflare DNS: two `A` records for `@` and a `CNAME` for `www`, all DNS only.

## 3. Supabase (Authentication → URL Configuration)

- [x] Add to **Redirect URLs** (2026-10-29):
  - `https://coinodyssey.app/auth/callback`
  - `https://coinodyssey.app/**` (**needed**: the reset link returns to `/auth/callback?type=recovery`, and Supabase matches the whole address, query included, so without the wildcard it falls back to the Site URL)
  - `http://localhost:3000/**` (only if testing email links locally; not added)
- [x] Reset Password email template: paste `supabase/templates/reset-password.html` into Authentication → Emails → Templates.
- [x] **Leave the Site URL as it is.** The mobile app's confirmation emails use it; web sign-ups and resets pass their own callback, which only needs to be on the list above.
- [x] `scan-allowance` edge function deployed (2026-10-22; read-only, powers "N scans left this month").

## 4. Search

- [x] Google Search Console (2026-10-29): Domain property `coinodyssey.app`, verified by a Cloudflare TXT record (keep it), sitemap `https://coinodyssey.app/sitemap.xml` submitted (a Domain property needs the full URL).
- [ ] Check a checklist page in the Rich Results Test (ItemList) and a share preview (Open Graph).

## 5. Legal and links

- [x] Published the studio site's updated privacy policy and terms (2026-10-24). They cover the website: essential sign-in cookies, theme in local storage, Vercel hosting and cookie-free Web Analytics, webcam, web account deletion and CSV export. `/privacy`, `/terms`, and `/cookies` redirect to the Coin Odyssey documents. No cookie banner is needed: there are no non-essential cookies.
- [x] Studio site: Coin Odyssey tile is Live, lists Web, and links to coinodyssey.app and the App Store (2026-10-29).

## 6. QA before announcing

- [ ] Chrome, Safari, and Firefox on a desktop; Safari on an iPhone (the Smart App Banner should offer the app); Chrome on Android.
- [ ] Both themes, and a printed checklist.
- [ ] Sign up on the web (the email should come back to the web), sign in, reset a password.
- [ ] A real scan from uploaded photos, and one from a webcam.
- [ ] Add, edit, and delete a coin; fill and clear an album slot; CSV export then import.
- [ ] The same account on the phone shows the same collection.

## Later

- Sentry for the web (`@sentry/nextjs`, with the mobile app's scrubbing rules), once mobile Sentry is switched on.
- Universal links (`apple-app-site-association`) so links open the app.
