-- Keep what a coin is made of, as the scan recognizer read it.
--
-- recognize-coin has always returned a composition ("90% Silver",
-- "Copper-Nickel Clad"), but the apps threw it away. The "Silver" and "Gold"
-- quick chips and the disc colors now mean metal instead of purchase price,
-- and the scan's own reading is the best evidence of metal there is. Coins
-- without it fall back to rules in packages/shared (coinMetal.ts).
--
-- Nullable on purpose: coins saved before this, and coins typed in by hand,
-- have none. Additive and nullable, so clients that never send it (1.0, 1.1)
-- keep working.

alter table public.coins
  add column if not exists composition text;

comment on column public.coins.composition is
  'What the coin is made of, from the scan recognizer. Null = not recorded.';
