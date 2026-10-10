-- Record how a coin entered the collection: scanned or typed in by hand.
--
-- After saving, a scanned coin and a manual one look the same, so nothing
-- could tell them apart. The First Scan achievement needs that, and it is
-- the basis for any later scan statistics.
--
-- Nullable on purpose: coins saved before 1.1 never recorded it, and there is
-- no reliable way to recover it for them. Null means "unknown", not "manual".
-- Additive and nullable, so 1.0 clients, which never send it, keep working.

alter table public.coins
  add column if not exists source text;

alter table public.coins
  drop constraint if exists coins_source_check;

alter table public.coins
  add constraint coins_source_check
  check (source is null or source in ('scan', 'manual'));

comment on column public.coins.source is
  'How the coin was added: scan or manual. Null = saved before this was recorded.';
