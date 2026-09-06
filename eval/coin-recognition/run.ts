/**
 * Accuracy eval for the coin recogniser.
 *
 * Calls the deployed `recognize-coin` edge function over HTTP, exactly as the
 * app does, so the eval exercises the real prompt, the real model config and
 * the real JSON parsing rather than a reconstruction that could drift from it.
 * The Anthropic key stays server-side and is never needed here.
 *
 *   npx tsx eval/coin-recognition/run.ts --variant baseline --reps 2
 *
 * Each run costs real money and consumes the account's monthly scan quota
 * (cases x reps scans). The default quota is 50/month — see README.
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grade, type Expected, type Recognition } from './grade.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const FLOW = path.join(REPO, '.claude/hillclimb/coin-recognition');

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const VARIANT = arg('variant', 'baseline');
const REPS = parseInt(arg('reps', '2'), 10);
const TIMEOUT_S = parseInt(arg('timeout-s', '120'), 10);
const CONCURRENCY = parseInt(arg('concurrency', '3'), 10);

/**
 * Read from mobile-app/.env so the eval runs against the same project the app
 * does. Never logged — an anon key in a terminal transcript is a key in a
 * transcript.
 */
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const file = path.join(REPO, 'mobile-app/.env');
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

/**
 * Refuses to run when the runner or grader changed since the last approval, so
 * a mid-experiment edit can never be mistaken for a model improvement. Only the
 * user clears it, with --approve-harness.
 */
async function harnessGate(): Promise<void> {
  const state = JSON.parse(await readFile(path.join(FLOW, '_state.json'), 'utf8'));
  const h = createHash('sha256');
  for (const rel of state.harness_paths) h.update(readFileSync(path.join(REPO, rel)));
  const sha = h.digest('hex').slice(0, 16);
  const stamp = path.join(FLOW, '.harness-sha');

  if (flag('approve-harness')) {
    await writeFile(stamp, sha);
    console.log(`Harness approved (${sha}).`);
    return;
  }
  const approved = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : null;
  if (approved !== sha) {
    console.error(
      `\nHarness changed (approved ${approved ?? 'none'}, now ${sha}).\n` +
        `Review eval/coin-recognition/run.ts and grade.ts, then re-run with --approve-harness.\n`
    );
    process.exit(2);
  }
}

interface CaseDef {
  id: string;
  obverse: string;
  reverse: string;
  tags: string[];
  expected: Expected;
  goldSource?: string;
  verified?: boolean;
}

type CallResult =
  | { ok: true; body: any; attempts: number }
  | { ok: false; failure: 'timeout' | 'harness_or_serving'; detail: string | null; attempts: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function recognize(
  url: string,
  anonKey: string,
  jwt: string,
  c: CaseDef
): Promise<CallResult> {
  const toB64 = async (rel: string) => (await readFile(path.join(HERE, rel))).toString('base64');
  const [obverse, reverse] = await Promise.all([toB64(c.obverse), toB64(c.reverse)]);

  let attempts = 0;
  let lastDetail: string | null = null;

  for (let i = 0; i < 4; i++) {
    attempts++;
    const ctrl = new AbortController();
    // A hard ceiling on total case time. An inactivity timer is not enough —
    // a stalled connection can emit keepalives indefinitely.
    const kill = setTimeout(() => ctrl.abort(), TIMEOUT_S * 1000);
    try {
      const res = await fetch(`${url}/functions/v1/recognize-coin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ obverseImage: obverse, reverseImage: reverse }),
        signal: ctrl.signal,
      });
      clearTimeout(kill);

      // Jittered backoff: a zero-delay retry under a rate limit multiplies
      // spend invisibly, and every attempt is billed whether or not it is scored.
      if (res.status === 429 || res.status >= 500) {
        lastDetail = `HTTP ${res.status}`;
        await sleep(2000 * 2 ** i + Math.random() * 1000);
        continue;
      }
      return { ok: true, body: await res.json(), attempts };
    } catch (err) {
      clearTimeout(kill);
      if ((err as Error).name === 'AbortError') {
        return { ok: false, failure: 'timeout', detail: `>${TIMEOUT_S}s`, attempts };
      }
      lastDetail = (err as Error).message;
      await sleep(2000 * 2 ** i + Math.random() * 1000);
    }
  }
  return { ok: false, failure: 'harness_or_serving', detail: lastDetail, attempts };
}

async function main(): Promise<void> {
  await harnessGate();

  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('mobile-app/.env is missing the Supabase URL or anon key');

  const cases: CaseDef[] = JSON.parse(await readFile(path.join(HERE, 'cases.json'), 'utf8'));
  const missing = cases.flatMap((c) =>
    [c.obverse, c.reverse].filter((f) => !existsSync(path.join(HERE, f)))
  );
  if (missing.length) {
    console.error(`\nMissing ${missing.length} image file(s), e.g. ${missing[0]}`);
    console.error('Add the photographs first — see eval/coin-recognition/README.md.\n');
    process.exit(1);
  }

  const outDir = path.join(FLOW, VARIANT);
  await mkdir(path.join(outDir, 'traces'), { recursive: true });
  const resultsFile = path.join(outDir, 'results.jsonl');
  const errorsFile = path.join(outDir, 'errors.jsonl');

  // Resume is keyed on (case, rep) so a crash costs only the work in flight,
  // and never produces a row whose score and transcript came from different calls.
  const done = new Set<string>();
  if (existsSync(resultsFile)) {
    for (const line of (await readFile(resultsFile, 'utf8')).split('\n').filter(Boolean)) {
      const row = JSON.parse(line);
      done.add(`${row.prompt_id}#${row.rep}`);
    }
    if (done.size) console.log(`Resuming — ${done.size} (case, rep) pairs already recorded.`);
  }

  const supabase = createClient(url, anonKey);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'demo@mosaicstudioapps.com',
    password: 'CoinOdyssey-Demo-2026!',
  });
  if (authErr || !auth.session) throw new Error(`Sign-in failed: ${authErr?.message}`);
  const jwt = auth.session.access_token;

  const jobs: Array<{ c: CaseDef; rep: number }> = [];
  for (const c of cases) {
    for (let rep = 0; rep < REPS; rep++) {
      if (!done.has(`${c.id}#${rep}`)) jobs.push({ c, rep });
    }
  }
  console.log(
    `${jobs.length} calls to make (${cases.length} cases x ${REPS} reps), variant "${VARIANT}".`
  );

  let pass = 0;
  let scored = 0;
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < jobs.length) {
      const { c, rep } = jobs[cursor++];
      const t0 = Date.now();
      const res = await recognize(url, anonKey, jwt, c);
      const latency_s = +((Date.now() - t0) / 1000).toFixed(2);

      // A harness failure must never take the (case, rep) slot in results.jsonl:
      // a row there would make resume skip it forever, and would score plumbing
      // as a model failure.
      if (!res.ok || !res.body?.success || !res.body?.result) {
        await appendFile(
          errorsFile,
          JSON.stringify({
            prompt_id: c.id,
            rep,
            attempts: res.attempts,
            latency_s,
            failure_class: res.ok ? 'harness_or_serving' : res.failure,
            detail: res.ok ? res.body?.error ?? null : res.detail,
          }) + '\n'
        );
        console.log(`  ${c.id} rep${rep}: ERROR`);
        continue;
      }

      const recognition = res.body.result as Recognition;
      const meta = res.body.meta ?? {};
      const { grade: g, meta: gm } = grade(recognition, c.expected);

      await writeFile(
        path.join(outDir, 'traces', `${c.id}_rep${rep}.json`),
        JSON.stringify(
          [
            {
              role: 'system',
              content: 'recognize-coin edge function (the prompt lives server-side)',
            },
            {
              role: 'user',
              content:
                `Obverse and reverse photographs of ${c.id}.\n\n` +
                `Expected:\n${JSON.stringify(c.expected, null, 2)}\n\n` +
                `Gold source: ${c.goldSource ?? 'n/a'}`,
              attachments: [
                { kind: 'image', ref: `../../../../eval/coin-recognition/${c.obverse}`, alt: 'obverse' },
                { kind: 'image', ref: `../../../../eval/coin-recognition/${c.reverse}`, alt: 'reverse' },
              ],
            },
            { role: 'assistant', content: JSON.stringify(recognition, null, 2) },
          ],
          null,
          2
        )
      );

      scored++;
      pass += g.all_correct;
      await appendFile(
        resultsFile,
        JSON.stringify({
          prompt_id: c.id,
          rep,
          prompt: `${c.id} — expected ${c.expected.year} ${c.expected.denomination}`,
          tags: c.tags,
          grade: g,
          meta: { ...gm, verified_gold: c.verified === true, attempts: res.attempts },
          model: meta.model ?? null,
          usage: meta.usage ?? null,
          stop_reason: meta.stopReason ?? null,
          status: meta.stopReason === 'max_tokens' ? 'truncated' : 'ok',
          latency_s,
        }) + '\n'
      );

      const wrong = Object.entries(g)
        .filter(([k, v]) => k !== 'all_correct' && k !== 'honest' && v === 0)
        .map(([k]) => k)
        .join(', ');
      console.log(
        `  ${c.id} rep${rep}: ${g.all_correct ? 'PASS' : 'FAIL'}` +
          `${wrong ? ` [${wrong}]` : ''}${g.honest ? '' : ' [overconfident]'} (${latency_s}s)`
      );
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (scored) {
    const rate = pass / scored;
    // Wald interval — enough to tell signal from noise at this sample size.
    const ci = 1.96 * Math.sqrt((rate * (1 - rate)) / scored);
    console.log(
      `\nall_correct: ${pass}/${scored} = ${(rate * 100).toFixed(1)}% ` +
        `+/- ${(ci * 100).toFixed(1)} (95% CI)\nRows: ${resultsFile}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
