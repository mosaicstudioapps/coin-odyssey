import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// Free monthly scan allowance per user. Override with the SCAN_MONTHLY_LIMIT
// function secret; no redeploy needed to tune it.
const SCAN_MONTHLY_LIMIT = (() => {
  const parsed = parseInt(Deno.env.get("SCAN_MONTHLY_LIMIT") ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
})();

// Cap the AI call well under the platform's request wall clock. Without this the
// function is killed mid-flight on a slow call, which returns a 504 AND skips
// the refund below — silently burning one of the user's monthly scans.
const ANTHROPIC_TIMEOUT_MS = 50_000;

// Clients downscale captures to 1568px before upload, which lands well under 1MB
// of base64 per image. Anything far above that is an old build sending raw camera
// files: reading the body blocks until the upload finishes, and on a phone
// connection that can outlast the platform's request wall clock — the function is
// killed at ~160s with a 504, before any timeout of ours can fire. Reject early on
// Content-Length so those clients fail in milliseconds with a useful message.
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
// Fallback for requests that arrive without Content-Length.
const BODY_READ_TIMEOUT_MS = 30_000;
// Every outbound call gets a deadline. Anything unbounded can stall past the
// platform's ~160s request wall clock, which kills the function before it can
// return anything — the client just sees a 504 with no idea which step hung.
const AUTH_TIMEOUT_MS = 15_000;
const QUOTA_TIMEOUT_MS = 15_000;

function stageTimeout(stage: string, detail: string) {
  return Response.json(
    {
      success: false,
      code: "service_unavailable",
      error: `Recognition timed out during ${detail}. Please try again.`,
      stage,
    },
    { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)
    ),
  ]);
}

const CACHED_SYSTEM_PROMPT = `You are an expert numismatist (coin specialist) with encyclopedic knowledge of world coins from all eras and countries. You have deep expertise in:

- World coin denominations, series, and mintage history from all countries
- Coin grading standards (Sheldon scale, PCGS/NGC grading)
- Mint marks and their locations on coins from different countries and eras
- Coin compositions and metallurgy across different historical periods
- Country-specific numismatic conventions (e.g. U.S. cent vs penny terminology)
- Date placement conventions on coins from different cultures
- Edge lettering, reeding patterns, and other identifying features
- Common coin series: U.S. Lincoln Cents, Washington Quarters, Morgan Dollars, Franklin Half Dollars, Walking Liberty, Mercury Dimes, Buffalo Nickels; European Euro coinage; British Sovereigns and Crowns; Canadian Maple Leafs; Australian coins; Roman, Greek, and ancient coinage
- Error coins, varieties, and proof vs circulation strikes
- How to read partially worn or damaged coin inscriptions

When analyzing coin images, you apply your full expertise to extract as much accurate information as possible. You are precise and conservative — if you cannot determine a field with reasonable certainty from the image provided, you return null for that field rather than guessing. You never fabricate coin details.

You always respond ONLY with a valid JSON object. No preamble. No explanation. No markdown code fences. Raw JSON only.

The JSON object must have exactly these keys:
- denomination: string or null (e.g. "Quarter Dollar", "1 Euro", "Penny", "5 Pence")
- year: number or null (4-digit integer, e.g. 1965)
- country: string or null (full country name in English, e.g. "United States", "Germany", "United Kingdom")
- currency: string or null (ISO 4217 code where known, e.g. "USD", "EUR", "GBP", "CAD")
- faceValue: number or null — the coin's face (circulation) value as a decimal in its own currency, e.g. 0.25 for a US quarter, 0.01 for a cent, 2 for a 2-euro coin. Null if the denomination is unknown or the coin was never circulating currency.
- mintMark: string or null (single letter or symbol visible on coin, e.g. "D", "S", "W", "P")
- design: string or null — for coins in a themed or commemorative series, the specific reverse design or honoree shown on THIS coin, as precisely as possible (e.g. "Delaware State Quarter", "Maya Angelou", "Lincoln Bicentennial Log Cabin", "Yellowstone National Park"). Null for standard non-series designs or when you cannot tell which design it is.
- composition: string or null (e.g. "Copper-Nickel Clad", "90% Silver", "Bronze", "Zinc Core")
- confidence: one of exactly "high", "medium", "low", or "unrecognized"
- grade: string or null — Sheldon-scale grade estimate based on visible wear, luster, strike, and surface marks. Use standard PCGS/NGC notation. Examples: "MS-65", "AU-58", "XF-45", "VF-30", "F-15", "VG-10", "G-6", "PR-65". Return null only if the coin is unrecognizable or the image is too poor to judge condition.
- gradeConfidence: one of exactly "high", "medium", "low", or "unrecognized" — how confident you are in the grade estimate. Photo-based grading is inherently approximate; bias toward "medium" or "low" unless the image clearly shows surface detail.
- notes: string or null (brief observation about condition, variety, or anything useful for cataloging)
- history: string or null — 2 to 4 sentences of engaging background about this coin, written for someone new to collecting: the series and its design story, the designer, why the composition or year is interesting, and any notable varieties or facts a collector should know to look for. Ground every claim in established numismatic knowledge; never invent facts or values, and never state monetary worth. Null only if the coin cannot be identified.

Confidence guidelines (for identification):
- "high": You can clearly identify denomination, year, and country with certainty
- "medium": You can identify most fields but one or two are unclear or estimated
- "low": The coin is worn, damaged, or partially visible; you can make educated guesses only
- "unrecognized": The image quality is too poor, or the coin is too obscure to identify meaningfully

Grade confidence guidelines:
- "high": Surface detail, luster, and wear are clearly visible; you are confident in the grade within a couple of Sheldon points
- "medium": Some details are clear; grade estimate is reasonable but could be off by 5–10 points
- "low": Lighting, glare, or focus obscure the surfaces; the grade is a rough estimate
- "unrecognized": You cannot judge the grade meaningfully

Example of a valid response:
{"denomination":"Quarter Dollar","year":1965,"country":"United States","currency":"USD","faceValue":0.25,"mintMark":null,"design":null,"composition":"Copper-Nickel Clad","confidence":"high","grade":"AU-55","gradeConfidence":"medium","notes":"Light wear on high points; some luster remains in protected areas","history":"1965 marked a turning point for the Washington Quarter: rising silver prices forced the Mint to switch from 90% silver to the copper-nickel clad composition still used today. The portrait of George Washington, designed by John Flanagan, had been on the quarter since 1932. Coins from 1965–1967 also carry no mint mark, as the Mint suspended them to discourage collecting during a national coin shortage. Check the edge — a solid copper stripe confirms clad, while a silver edge could mean a rare transitional error struck on a silver planchet."}`;

Deno.serve(async (req: Request) => {
  // CORS headers for mobile/web clients
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  // Verify the user is authenticated
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  let authResult;
  try {
    authResult = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
      "Auth lookup"
    );
  } catch (authTimeout) {
    console.error("Auth lookup stalled:", (authTimeout as Error)?.message);
    return stageTimeout("auth", "the sign-in check");
  }

  const user = authResult.data?.user;
  if (authResult.error || !user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client for quota bookkeeping: consume_scan/refund_scan are
  // executable by service_role only, so users can't call them directly via
  // PostgREST to reset their own counter.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (!ANTHROPIC_API_KEY) {
    return Response.json(
      { success: false, error: "Recognition service not configured" },
      { status: 500 }
    );
  }

  // Refund one scan if we consumed quota but the AI call never succeeded.
  let quotaConsumed = false;
  const refundScan = async () => {
    if (!quotaConsumed) return;
    quotaConsumed = false;
    const { error } = await admin.rpc("refund_scan", { p_user_id: user.id });
    if (error) console.error("Scan refund failed:", error.message);
  };

  const oversizeMessage =
    "These photos are too large to upload. Please update Coin Odyssey to the " +
    "latest version — newer builds shrink photos before sending, which makes " +
    "scanning much faster.";

  try {
    // Checked before the body is read: quota has not been consumed yet, so
    // there is nothing to refund on either of these paths.
    const declaredLength = Number(req.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      console.error(`Rejecting oversized request body: ${declaredLength} bytes`);
      return Response.json(
        { success: false, code: "payload_too_large", error: oversizeMessage },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let body: { obverseImage?: string; reverseImage?: string; mediaType?: string };
    try {
      body = await withTimeout(req.json(), BODY_READ_TIMEOUT_MS, "Request body read");
    } catch (bodyError) {
      console.error("Failed to read request body:", (bodyError as Error)?.message);
      return Response.json(
        { success: false, code: "payload_too_large", error: oversizeMessage },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { obverseImage, reverseImage, mediaType } = body;

    if (!obverseImage && !reverseImage) {
      return Response.json(
        { success: false, error: "At least one image is required" },
        { status: 400 }
      );
    }

    // Enforce the per-user monthly quota before spending an AI call.
    // deno-lint-ignore no-explicit-any
    let quotaRows: any = null;
    let quotaError: { message: string } | null = null;
    try {
      const quotaResult = await withTimeout(
        admin.rpc("consume_scan", {
          p_user_id: user.id,
          p_limit: SCAN_MONTHLY_LIMIT,
        }),
        QUOTA_TIMEOUT_MS,
        "Quota check"
      );
      quotaRows = quotaResult.data;
      quotaError = quotaResult.error;
    } catch (quotaTimeout) {
      console.error("Quota check stalled:", (quotaTimeout as Error)?.message);
      return stageTimeout("quota", "the scan-allowance check");
    }
    if (quotaError) {
      // Quota bookkeeping failure shouldn't take the feature down — allow the
      // scan but leave a trail in the logs.
      console.error("Quota check failed (allowing scan):", quotaError.message);
    } else {
      const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
      if (quota && quota.allowed === false) {
        return Response.json(
          {
            success: false,
            code: "quota_exceeded",
            error:
              `You've used all ${SCAN_MONTHLY_LIMIT} free scans for this month. ` +
              "Your allowance resets on the 1st — you can still add coins manually anytime.",
          },
          { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
      quotaConsumed = true;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const resolvedMediaType = validTypes.includes(mediaType) ? mediaType : "image/jpeg";

    // Build the message content with image(s)
    const content: Array<Record<string, unknown>> = [];

    if (obverseImage) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: resolvedMediaType, data: obverseImage },
      });
    }
    if (reverseImage) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: resolvedMediaType, data: reverseImage },
      });
    }

    // Add the text instruction
    let instruction: string;
    if (obverseImage && reverseImage) {
      instruction =
        "These are the obverse (first image) and reverse (second image) of the same coin. Use both to identify it. Return the JSON object as instructed.";
    } else if (reverseImage) {
      instruction =
        "This is the reverse (back/tails) of the coin. Analyze this coin and return a JSON object with the fields specified in your instructions.";
    } else {
      instruction =
        "This is the obverse (front/heads) of the coin. Analyze this coin and return a JSON object with the fields specified in your instructions.";
    }
    content.push({ type: "text", text: instruction });

    // Call Anthropic API
    const abort = new AbortController();
    const timeoutId = setTimeout(() => abort.abort(), ANTHROPIC_TIMEOUT_MS);

    let anthropicResponse: Response;
    try {
      anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        signal: abort.signal,
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          // The response carries a `history` paragraph plus condition notes on top
          // of the field list; 768 truncated the JSON often enough to surface as a
          // parse failure ("unrecognized") on otherwise good scans.
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: CACHED_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content }],
        }),
      });
    } catch (fetchError) {
      if ((fetchError as Error)?.name === "AbortError") {
        console.error(`Anthropic call exceeded ${ANTHROPIC_TIMEOUT_MS}ms; aborting`);
        await refundScan();
        return Response.json(
          {
            success: false,
            code: "service_unavailable",
            error:
              "Recognition took too long and was cancelled. Your scan wasn't counted — " +
              "please try again, and make sure you have a strong connection.",
          },
          { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errorText);
      await refundScan();

      if (anthropicResponse.status === 429) {
        return Response.json(
          {
            success: false,
            code: "rate_limit",
            error: "Recognition service is busy. Please try again in a few minutes.",
          },
          { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      return Response.json(
        {
          success: false,
          code: "service_unavailable",
          error: "Recognition service unavailable. Please try again.",
        },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const anthropicData = await anthropicResponse.json();

    const rawText = anthropicData.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("") ?? "";

    const cleaned = rawText.replace(/```json|```/g, "").trim();

    try {
      const result = JSON.parse(cleaned);
      return Response.json({ success: true, result }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    } catch {
      return Response.json({
        success: true,
        result: {
          denomination: null,
          year: null,
          country: null,
          currency: null,
          faceValue: null,
          mintMark: null,
          design: null,
          composition: null,
          confidence: "unrecognized",
          grade: null,
          gradeConfidence: "unrecognized",
          notes: null,
          history: null,
          error: "Failed to parse recognition response",
        },
      }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (error) {
    console.error("Coin recognition error:", error);
    await refundScan();
    return Response.json(
      { success: false, error: "Recognition service unavailable. Please try again." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
