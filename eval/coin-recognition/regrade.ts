/**
 * Re-score a finished run against the current gold, without calling anything.
 *
 *   npx tsx eval/coin-recognition/regrade.ts --variant baseline
 *
 * Gold gets corrected — the first baseline turned up three labels that were
 * wrong, one of which the recogniser had been answering correctly all along.
 * Re-running the sweep to pick that up would spend the scan allowance again and,
 * worse, would mix a gold fix into the same number as fresh model output. The
 * model's answers are already on disk in `traces/`, so the honest move is to
 * re-score those and leave the API alone.
 *
 * Writes `results.regraded.jsonl` beside the original and leaves
 * `results.jsonl` untouched, so the run as first scored stays auditable.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grade } from './grade.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const FLOW = path.join(REPO, '.claude/hillclimb/coin-recognition');

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const VARIANT = arg('variant', 'baseline');

type CaseDef = { id: string; expected: Record<string, unknown>; verified?: boolean; tags: string[] };

async function main(): Promise<void> {
  const dir = path.join(FLOW, VARIANT);
  const resultsFile = path.join(dir, 'results.jsonl');
  if (!existsSync(resultsFile)) {
    console.error(`\nNo results at ${resultsFile}\n`);
    process.exit(1);
  }

  const cases: CaseDef[] = JSON.parse(await readFile(path.join(HERE, 'cases.json'), 'utf8'));
  const byId = new Map(cases.map((c) => [c.id, c]));

  const traceDir = path.join(dir, 'traces');
  const traceFiles = new Set(await readdir(traceDir));

  const rows = (await readFile(resultsFile, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));

  const out: string[] = [];
  let changed = 0;
  let missing = 0;

  for (const row of rows) {
    const c = byId.get(row.prompt_id);
    const traceName = `${row.prompt_id}_rep${row.rep}.json`;
    if (!c || !traceFiles.has(traceName)) {
      missing++;
      continue;
    }

    // The trace is a chat transcript for the report builder; the assistant turn
    // holds the recogniser's raw JSON exactly as it came back.
    const trace = JSON.parse(await readFile(path.join(traceDir, traceName), 'utf8'));
    const assistant = trace.find((m: { role: string }) => m.role === 'assistant');
    let recognition: Record<string, unknown>;
    try {
      recognition = JSON.parse(assistant.content);
    } catch {
      missing++;
      continue;
    }

    const { grade: g, meta: gm } = grade(recognition as never, c.expected as never);
    const before = JSON.stringify(row.grade);
    if (before !== JSON.stringify(g)) changed++;

    out.push(JSON.stringify({
      ...row,
      grade: g,
      meta: { ...gm, verified_gold: c.verified === true, attempts: row.meta?.attempts ?? 1 },
      regraded: true,
    }));
  }

  const outFile = path.join(dir, 'results.regraded.jsonl');
  await writeFile(outFile, out.join('\n') + '\n');

  const scored = out.map((l) => JSON.parse(l));
  const rate = (k: string) => {
    const vals = scored.map((r) => r.grade[k]).filter((v) => v !== null && v !== undefined);
    const pass = vals.reduce((a: number, b: number) => a + b, 0);
    return vals.length ? `${pass}/${vals.length} = ${((100 * pass) / vals.length).toFixed(1)}%` : 'n/a';
  };

  console.log(`\nRe-scored ${scored.length} rows against current gold (${changed} changed).`);
  if (missing) console.log(`${missing} row(s) had no usable trace and were dropped.`);
  console.log('');
  for (const k of ['all_correct', 'honest', 'year', 'mint_mark', 'denomination', 'country', 'design', 'category']) {
    console.log('  ' + k.padEnd(14), rate(k));
  }
  console.log(`\n${outFile}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
