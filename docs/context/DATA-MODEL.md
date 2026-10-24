# Data model

The database is Supabase Postgres. Every table has row-level security (RLS) scoped to the owner. Several tables predate the mobile-only pivot and are unused; they are listed at the end.

## Used by the app

**User.** Supabase Auth only; there is no profile table.

**Collection.** Exactly one per user, enforced by a unique constraint. Fields: name, description.

**Coin.** Belongs to a collection, and ownership is checked through the collection.
- Identity: `name`/`title`, `year` (required; 0 means unknown), `country`, `denomination` (free text), `mint_mark`, `grade` (Sheldon notation, e.g. "MS-65").
- `category` is nullable, one of `circulating | commemorative | bullion | proof | special | ancient`. Kept apart from denomination because legacy rows put type words there and broke album matching.
- `mint_mark` holds a real mark ("D", "CC"), `NONE` (no mark; treated as Philadelphia), or `UNKNOWN` (never fills an album slot). A legacy blank means Philadelphia. The app now requires a choice.
- Album tags: `series_id`, `specific_coin_id`, `specific_coin_name`. The value `__none__` in `specific_coin_id` excludes the coin from all album matching.
- `historical_notes` holds the AI "About this coin" text. `notes` holds user notes. `condition_notes` holds the scan's condition observation (earlier scans put it in `notes`).
- `source` is `scan`, `manual`, or null for older coins. `composition`: the scan's metal.
- `face_value` is in the coin's own currency, so it can't be summed across countries.
- `purchase_price`, `purchase_date`.
- `images` is an array of storage paths.
- Legacy and unwritten: market, personal, and appraisal values, `pcgs_id`, `mintage`, `rarity_scale`, designer, theme, honoree, certification, grading service, `series`, `variety_notes`.

**Scan usage.** One row per user per UTC month with `scan_count`, written only by service-role `consume_scan`/`refund_scan`. Limit 25 unless a secret overrides it.

**Want list (1.2; table live 2026-10-24).** `want_list` rows of (user, album id, slot id); RLS own rows; cascades with the account.

**Achievement unlocks.** One `user_achievements` row per earned badge, with `unlocked_at`. Rows stay when coins are deleted, so a badge stays earned.

**Coin photos.** A private `coin-images` bucket with one folder per user id. Limits are 5 MB and JPEG/PNG/WebP only. The app reads photos through signed URLs. No migration creates the bucket; the migration only reconfigures it.

## Static data (shared package, not the database)

- **Albums (18):** quarters (AWQ, State, ATB, Washington), Lincoln cents (Wheat, Memorial, Shield to 2026), nickels (Buffalo, Jefferson), dimes (Mercury, Roosevelt), halves (Walking Liberty, Kennedy), dollars (Morgan, Peace, Native American, Presidential), World. Open-ended series stop at a checked year. Slots match by design keyword plus year, year plus mint, or country.
- **Series catalog:** used by albums; other entries are mostly stubs.
- **Achievements:** 28 badge definitions, computed on the device from coins and albums.
- **Goal templates:** no screen uses them.

## Legacy tables (unused by the app)

- `coin_value_history`: price history per coin. Conflicts with the no-pricing decision.
- `coin_varieties`, `grading_guides`: reference data.
- `collection_shares`: `view | edit` permissions. No sharing UI, none planned.
- `collection_goals`: goal types include series_complete, country_complete, value_target, and others. The mobile service exists but nothing calls it.
- `contact_messages`, `user_consent_preferences`, `user_consent_history`: no client uses them since the web rebuild removed the contact form and consent tooling.

Account deletion is handled by an edge function that deletes table by table and removes the photo folder. The foreign keys do not cascade.
