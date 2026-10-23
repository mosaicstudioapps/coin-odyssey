# Launch checklist

Everything the code needs is in place; these are the account steps, in order.
Nothing secret belongs in this file or the repo: the two public Supabase values
go in Vercel's settings, never a service-role key.

## 1. Domain

- [ ] Buy the domain (planned: `coinodyssey.app`).

## 2. Vercel

- [ ] New project from the GitHub repo. **Root directory: `web-app`.** Framework: Next.js. `vercel.json` already installs from the repo root (the app is a workspace) and skips builds when nothing web-related changed.
- [ ] Production branch: `release/web-1.0` until it merges into `main`.
- [ ] Environment variables (Production and Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` = `https://<domain>` (sitemap, canonical links, share images)
- [ ] Settings → Analytics → enable **Web Analytics** (cookie-free; the app already includes it).
- [ ] Settings → Domains → add the domain and set the DNS records Vercel shows.

## 3. Supabase (Authentication → URL Configuration)

- [ ] Add to **Redirect URLs**:
  - `https://<domain>/auth/callback`
  - `http://localhost:3000/auth/callback` (local testing)
- [ ] **Leave the Site URL as it is.** The mobile app's confirmation emails use it; web sign-ups and resets pass their own callback, which only needs to be on the list above.
- [x] `scan-allowance` edge function deployed (2026-10-22; read-only, powers "N scans left this month").

## 4. Search

- [ ] Google Search Console: add the domain, verify by DNS, submit `https://<domain>/sitemap.xml`.
- [ ] Check a checklist page in the Rich Results Test (ItemList) and a share preview (Open Graph).

## 5. Legal and links

- [ ] Privacy policy on mosaicstudioapps.com: add the website (essential sign-in cookies only; Vercel Web Analytics, which sets no cookies and collects no personal data). The site is reachable from the EU even though the stores aren't.
- [ ] Studio site: link to the domain.

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
