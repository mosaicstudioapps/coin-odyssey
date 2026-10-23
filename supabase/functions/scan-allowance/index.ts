import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// How many of this month's free scans the signed-in user has used, so the
// apps can say "N scans left this month" before the limit surprises anyone.
//
// Read-only. The count comes from scan_usage through the user's own session
// (row-level security limits it to their row), and the limit from the same
// SCAN_MONTHLY_LIMIT secret recognize-coin enforces, so the two can't disagree.
// Keep the default below in step with recognize-coin's.

const SCAN_MONTHLY_LIMIT = (() => {
  const parsed = parseInt(Deno.env.get("SCAN_MONTHLY_LIMIT") ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
})();

const TIMEOUT_MS = 10_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function withTimeout<T>(work: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(work),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)),
  ]);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ success: false, code: "auth", error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { data: auth, error: authError } = await withTimeout(supabase.auth.getUser(), TIMEOUT_MS, "Auth lookup");
    if (authError || !auth.user) return json({ success: false, code: "auth", error: "Unauthorized" }, 401);

    // Months are counted in UTC, the same way consume_scan counts them.
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

    const { data, error } = await withTimeout(
      supabase.from("scan_usage").select("scan_count").eq("user_id", auth.user.id).eq("month", month).maybeSingle(),
      TIMEOUT_MS,
      "Usage lookup"
    );
    if (error) {
      console.error("Usage lookup failed:", error.message);
      return json({ success: false, code: "service_unavailable", error: "Could not check your scans." });
    }

    const used = Math.min(data?.scan_count ?? 0, SCAN_MONTHLY_LIMIT);
    return json({
      success: true,
      result: { used, limit: SCAN_MONTHLY_LIMIT, remaining: SCAN_MONTHLY_LIMIT - used, resetsAt },
    });
  } catch (err) {
    console.error("Scan allowance failed:", (err as Error)?.message);
    return json({ success: false, code: "service_unavailable", error: "Could not check your scans." });
  }
});
