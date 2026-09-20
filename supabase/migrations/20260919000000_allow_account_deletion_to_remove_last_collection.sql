-- Account deletion could never finish for any user who had saved a coin.
--
-- prevent_delete_last_collection exists so a user cannot delete their only
-- collection from inside the app. But deleting an account has to remove every
-- collection the user owns, and the final row always tripped the guard: the
-- delete-account edge function got as far as removing the coins, then failed
-- with "Cannot delete the last collection" (P0001) and left the account alive.
-- Apple guideline 5.1.1(v) requires in-app account deletion to work, so this is
-- a release blocker rather than a cleanup.
--
-- Observed 2026-09-19 on a throwaway account that had scanned one coin. The
-- earlier test account deleted cleanly only because it never saved a coin, so
-- no collection row existed yet.
--
-- The guard now steps aside in the two cases where it protects nothing:
--   * the caller is service_role -- that is the delete-account function, not a
--     user acting in the app
--   * the owning auth user is already gone, so there is no account left to keep
--     a collection for
--
-- Normal users deleting a collection from the app still hit the guard.

create or replace function public.prevent_delete_last_collection()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if auth.role() = 'service_role' then
        return old;
    end if;

    if not exists (select 1 from auth.users where id = old.user_id) then
        return old;
    end if;

    if (select count(*) from collections where user_id = old.user_id) <= 1 then
        raise exception 'Cannot delete the last collection';
    end if;

    return old;
end;
$function$;
