import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Text-only sibling of `recognize-coin`. Where that function reads photos to
// identify a coin (and returns a `history` paragraph as a bonus), this one takes
// catalog fields the user already typed and writes the same "About this coin"
// paragraph. It exists so manually entered coins get the educational text too,
// and so a scan that came back without a story can be topped up later.
//
// Deliberately NOT metered against the scan allowance: a manual entry shouldn't
// spend one of the user's monthly scans, and this call is a fraction of the cost
// (no images, ~400 output tokens, cached system prompt).

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const ANTHROPIC_TIMEOUT_MS = 30_000;
const AUTH_TIMEOUT_MS = 15_000;
const BODY_READ_TIMEOUT_MS = 10_000;

const CORS = { "Access-Control-Allow-Origin": "*" };

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)
    ),
  ]);
}

const CACHED_SYSTEM_PROMPT = `You are an expert numismatist (coin specialist) with encyclopedic knowledge of world coins from all eras and countries — series and design history, designers and their other work, mint marks and mint facilities, compositions and the economic reasons they changed, notable varieties and errors, and the conventions collectors use.

You will be given the catalog details a collector has recorded for a coin in their collection: typically year, denomination and country, and sometimes a mint mark, series name, the specific issue within that series, an honoree or theme, a designer, or a free-text title. You will NOT be given photographs. Write a short, engaging background note about that coin for someone new to collecting.

You always respond ONLY with a valid JSON object. No preamble. No explanation. No markdown code fences. Raw JSON only.

The JSON object must have exactly these keys:
- history: string or null — 2 to 4 sentences of engaging background about this coin, written for someone new to collecting: the series and its design story, the designer, why the composition or year is interesting, and any notable varieties or facts a collector should know to look for.
- confidence: one of exactly "high", "medium", or "low" — how certain you are that the details given describe a real, specific coin you actually know.

Rules for the history field:
- Ground every claim in established numismatic knowledge. Never invent a designer, a mintage, a variety, or a historical anecdote.
- Never state or imply monetary worth: no values, no price ranges, no "worth more than", no "valuable", no "rare and sought-after" framing that functions as a price signal. Describing a coin as scarce or low-mintage is fine when factual; attaching money to it is not.
- Write about the coin as an object and a story, not as an investment.
- Do not restate the details you were given as a bare summary ("This is a 1965 quarter from the United States."). The collector already knows those. Lead with what they don't know.
- Where a detail was not provided and genuinely changes the story, speak to the series in general rather than guessing the specific issue. For example, if no mint mark was given, do not assert the coin was struck in Philadelphia.
- Many series issue several different designs in the same year — the 50 State Quarters released five states per year from 1999 to 2008, and the American Women Quarters released five honorees per year from 2022. When the year and denomination place a coin in such a series but nothing identifies WHICH issue it is, never pick one. Do not choose the most famous, the most common, or the first alphabetically. Write about the series and that year's program instead, and close by inviting the collector to record which design theirs shows so you can tell them more about it.
- The collector is holding the coin, so treat anything they recorded — the specific issue, the honoree, the theme, or a title like "1999 Delaware State Quarter" — as reliable identification, and write about that exact issue.
- Plain prose. No headings, no bullet points, no markdown.

Return history: null (with confidence "low") when the details are too sparse or too generic to say anything true and specific — for example a denomination with no country, a year that doesn't exist for that series, or a description that doesn't correspond to a coin you recognize. A null is far better than a plausible-sounding invention.

Example input: Year 1965, Denomination "Quarter Dollar", Country "United States".
Example of a valid response:
{"history":"1965 marked a turning point for the Washington Quarter: rising silver prices forced the Mint to abandon the 90% silver composition in favor of the copper-nickel clad sandwich still used today. The portrait of George Washington, designed by John Flanagan, had been on the quarter since 1932, adapted from a bust sculpted for the bicentennial of Washington's birth. Quarters from 1965 through 1967 carry no mint mark at all — the Mint suspended them nationwide to discourage collecting during a severe coin shortage. Look at the edge of yours: a solid copper stripe confirms the clad composition, while a plain silver edge would be worth a much closer look.","confidence":"high"}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...CORS,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, content-type, apikey, x-client-info",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: CORS }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: CORS }
    );
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
    return Response.json(
      {
        success: false,
        code: "service_unavailable",
        error: "Timed out checking your sign-in. Please try again.",
      },
      { status: 200, headers: CORS }
    );
  }

  if (authResult.error || !authResult.data?.user) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: CORS }
    );
  }

  if (!ANTHROPIC_API_KEY) {
    return Response.json(
      { success: false, error: "Story service not configured" },
      { status: 500, headers: CORS }
    );
  }

  try {
    let body: {
      year?: number | null;
      denomination?: string | null;
      country?: string | null;
      mintMark?: string | null;
      series?: string | null;
      designer?: string | null;
      name?: string | null;
      specificCoinName?: string | null;
      theme?: string | null;
      honoree?: string | null;
    };
    try {
      body = await withTimeout(req.json(), BODY_READ_TIMEOUT_MS, "Body read");
    } catch (bodyError) {
      console.error("Failed to read request body:", (bodyError as Error)?.message);
      return Response.json(
        { success: false, error: "Could not read the request." },
        { status: 400, headers: CORS }
      );
    }

    // Trim and drop blanks so the model never sees an empty mint mark and reads
    // it as a meaningful absence of a mark.
    const clean = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t === "" ? null : t;
    };

    const year =
      typeof body.year === "number" && Number.isFinite(body.year) && body.year > 0
        ? Math.trunc(body.year)
        : null;
    const denomination = clean(body.denomination);
    const country = clean(body.country);
    const mintMark = clean(body.mintMark);
    const series = clean(body.series);
    const designer = clean(body.designer);
    const name = clean(body.name);
    const specificCoinName = clean(body.specificCoinName);
    const theme = clean(body.theme);
    const honoree = clean(body.honoree);

    // A denomination alone can't identify a coin, and a year alone certainly
    // can't. Fail here rather than spending a call to be told "null".
    if (!denomination || (!year && !series)) {
      return Response.json(
        {
          success: false,
          code: "insufficient_detail",
          error:
            "Add at least a year and denomination — there isn't enough here to look this coin up.",
        },
        { status: 200, headers: CORS }
      );
    }

    const facts = [
      year ? `Year: ${year}` : null,
      `Denomination: ${denomination}`,
      country ? `Country: ${country}` : "Country: not recorded",
      mintMark ? `Mint mark: ${mintMark}` : null,
      series ? `Series: ${series}` : null,
      specificCoinName ? `Specific issue within the series: ${specificCoinName}` : null,
      honoree ? `Honoree: ${honoree}` : null,
      theme ? `Theme: ${theme}` : null,
      designer ? `Designer (as recorded by the collector): ${designer}` : null,
      name ? `Collector's title for this coin: ${name}` : null,
    ]
      .filter(Boolean)
      .join("\n");

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
          max_tokens: 512,
          system: [
            {
              type: "text",
              text: CACHED_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content:
                `A collector recorded these details for a coin in their collection:\n\n${facts}\n\n` +
                `Write the background note. Return the JSON object as instructed.`,
            },
          ],
        }),
      });
    } catch (fetchError) {
      if ((fetchError as Error)?.name === "AbortError") {
        console.error(`Anthropic call exceeded ${ANTHROPIC_TIMEOUT_MS}ms; aborting`);
        return Response.json(
          {
            success: false,
            code: "service_unavailable",
            error: "Writing the story took too long. Please try again.",
          },
          { status: 200, headers: CORS }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errorText);

      if (anthropicResponse.status === 429) {
        return Response.json(
          {
            success: false,
            code: "rate_limit",
            error: "The story service is busy. Please try again in a few minutes.",
          },
          { status: 200, headers: CORS }
        );
      }

      return Response.json(
        {
          success: false,
          code: "service_unavailable",
          error: `Story service error (${anthropicResponse.status}). Please try again.`,
        },
        { status: 200, headers: CORS }
      );
    }

    const anthropicData = await anthropicResponse.json();

    const rawText =
      anthropicData.content
        ?.filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("") ?? "";

    const cleaned = rawText.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      const history = clean(parsed?.history);
      return Response.json(
        {
          success: true,
          result: {
            history,
            confidence: parsed?.confidence ?? "low",
          },
        },
        { headers: CORS }
      );
    } catch {
      console.error("Failed to parse story response:", cleaned.slice(0, 300));
      return Response.json(
        { success: true, result: { history: null, confidence: "low" } },
        { headers: CORS }
      );
    }
  } catch (error) {
    console.error("Coin story error:", error);
    return Response.json(
      { success: false, error: "Story service unavailable. Please try again." },
      { status: 500, headers: CORS }
    );
  }
});
