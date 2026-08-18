-- Give coin *type* a field of its own.
--
-- Without one, collectors record it in `denomination` — the imported rows in
-- this database hold "Commemorative", "Regular issue" and "Bullion" there,
-- which is a catalogue's type vocabulary, not a denomination. Album matching
-- reads `denomination` to learn what a coin is worth, so every such row was
-- unmatchable. The column is the durable half of that fix; the app-side half
-- is a picker that offers these values directly.
--
-- Nullable on purpose: unlike a mint mark, this stays readable off the coin
-- itself, so an unanswered one can be filled in later without losing anything.
-- The first five values mirror CoinSeries.category so the two vocabularies
-- agree; `ancient` covers coins struck before modern mint practice, where
-- "circulating" draws no useful distinction.

alter table public.coins
  add column if not exists category text;

alter table public.coins
  drop constraint if exists coins_category_check;

alter table public.coins
  add constraint coins_category_check
  check (
    category is null
    or category in ('circulating', 'commemorative', 'bullion', 'proof', 'special', 'ancient')
  );

comment on column public.coins.category is
  'What kind of issue the coin is, separate from its denomination. Null = unanswered.';
