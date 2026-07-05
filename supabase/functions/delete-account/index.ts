import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Schema notes:
// - FK references to auth.users(id) do NOT have ON DELETE CASCADE in the baseline migration,
//   so we must explicitly delete user-scoped data before deleting the auth user.
// - Order matters: child tables first, parent tables last.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  // Resolve the caller as a normal user with their JWT.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const userId = user.id;

  // Admin client (service role) to perform privileged deletes.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Find the user's collection ids
    const { data: cols, error: colErr } = await admin
      .from("collections")
      .select("id")
      .eq("user_id", userId);
    if (colErr) throw colErr;
    const collectionIds = (cols ?? []).map((c: { id: string }) => c.id);

    // 2) Find the user's coin ids (via their collections). Also collect image
    //    references now, before the rows are gone, so Storage can be cleaned up.
    let coinIds: string[] = [];
    const imageRefs: string[] = [];
    if (collectionIds.length > 0) {
      const { data: cs, error: coinsErr } = await admin
        .from("coins")
        .select("id, images")
        .in("collection_id", collectionIds);
      if (coinsErr) throw coinsErr;
      coinIds = (cs ?? []).map((c: { id: string }) => c.id);
      for (const c of cs ?? []) {
        for (const ref of (c as { images: string[] | null }).images ?? []) {
          if (ref) imageRefs.push(ref);
        }
      }
    }

    // 3) Delete coin-scoped child rows
    if (coinIds.length > 0) {
      const { error: e1 } = await admin
        .from("coin_value_history")
        .delete()
        .in("coin_id", coinIds);
      if (e1) throw e1;

      const { error: e2 } = await admin
        .from("coin_varieties")
        .delete()
        .in("coin_id", coinIds);
      if (e2) throw e2;

      const { error: e3 } = await admin.from("coins").delete().in("id", coinIds);
      if (e3) throw e3;
    }

    // 4) Delete collection_shares — both the rows that *target* this user and any
    //    rows that share *from* a collection this user owns.
    {
      const { error } = await admin
        .from("collection_shares")
        .delete()
        .eq("shared_with_user_id", userId);
      if (error) throw error;
    }
    if (collectionIds.length > 0) {
      const { error } = await admin
        .from("collection_shares")
        .delete()
        .in("collection_id", collectionIds);
      if (error) throw error;
    }

    // 5) Delete user-scoped rows in other tables. These all have user_id columns.
    //    We tolerate missing tables (if a deployment lags) so the function stays robust.
    const userScopedTables = [
      "collection_goals",
      "user_achievements",
      "user_consent_preferences",
      "user_consent_history",
    ];
    for (const table of userScopedTables) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error && error.code !== "42P01") {
        // 42P01 = undefined_table; ignore for resilience.
        throw error;
      }
    }

    // 6) Finally, delete the collections themselves
    if (collectionIds.length > 0) {
      const { error } = await admin.from("collections").delete().in("id", collectionIds);
      if (error) throw error;
    }

    // 7) Delete the user's coin photos from Storage. Best-effort: a Storage
    //    hiccup shouldn't block account deletion, but log it so orphans can
    //    be swept later.
    try {
      const paths = new Set<string>();

      // Current scheme: everything lives under {userId}/ in coin-images.
      const pageSize = 100;
      let offset = 0;
      while (true) {
        const { data: files, error: listErr } = await admin.storage
          .from("coin-images")
          .list(userId, { limit: pageSize, offset });
        if (listErr) {
          console.error("delete-account: storage list failed:", listErr.message);
          break;
        }
        for (const f of files ?? []) paths.add(`${userId}/${f.name}`);
        if (!files || files.length < pageSize) break;
        offset += pageSize;
      }

      // Legacy references: rows created before per-user folders stored full
      // public URLs or coins/... paths. Normalize both to bucket paths.
      for (const ref of imageRefs) {
        const marker = "/object/public/coin-images/";
        const idx = ref.indexOf(marker);
        if (idx !== -1) {
          paths.add(decodeURIComponent(ref.slice(idx + marker.length)));
        } else if (!ref.includes("://")) {
          paths.add(ref);
        }
      }

      if (paths.size > 0) {
        const { error: removeErr } = await admin.storage
          .from("coin-images")
          .remove([...paths]);
        if (removeErr) {
          console.error("delete-account: storage cleanup failed:", removeErr.message);
        }
      }
    } catch (storageErr) {
      console.error("delete-account: storage cleanup error:", storageErr);
    }

    // 8) Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: message }, 500);
  }
});
