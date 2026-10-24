-- The want list (1.2): album slots a collector is hunting for.
--
-- One row per wanted slot. album_id and slot_id are the ids from the shared
-- album data (packages/shared/src/data/albums.ts); a slot in a quarter
-- album's P-and-D view has an id like "delaware_1999__D". Nothing references
-- these ids, so a slot that is later renamed simply drops off the list.
--
-- Only additive: a new table no current app version reads. Rows go with the
-- account (on delete cascade), so account deletion needs no change.

create table if not exists public.want_list (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  album_id text not null check (char_length(album_id) between 1 and 64),
  slot_id text not null check (char_length(slot_id) between 1 and 128),
  created_at timestamptz not null default now(),
  primary key (user_id, album_id, slot_id)
);

comment on table public.want_list is
  'Album slots a collector wants. Ids come from the shared album data.';

alter table public.want_list enable row level security;

drop policy if exists "Users can view own want list" on public.want_list;
create policy "Users can view own want list"
  on public.want_list for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add to own want list" on public.want_list;
create policy "Users can add to own want list"
  on public.want_list for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove from own want list" on public.want_list;
create policy "Users can remove from own want list"
  on public.want_list for delete
  using (auth.uid() = user_id);
