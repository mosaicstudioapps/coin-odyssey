/**
 * Turn a folder of camera photos into eval fixtures.
 *
 *   node eval/coin-recognition/ingest.mjs --from "C:/path/to/coin-photos"
 *   # ... fill in labels.csv from the physical coins ...
 *   node eval/coin-recognition/ingest.mjs --build
 *
 * Pass 1 pairs the photos in shooting order (obverse, reverse, obverse, ...),
 * resizes them to the width the app actually sends, and writes a `labels.csv`
 * with one row per coin plus a `pairs.html` contact sheet to check the pairing
 * by eye. Pass 2 turns the filled-in CSV into `cases.json`.
 *
 * It never fills in a label. Gold has to come off the physical coin — a label
 * read from the photograph by anything that could also be wrong about the
 * photograph is not evidence, it is a second opinion, and it would quietly turn
 * this eval into a test of whether two readers agree.
 */

import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IMAGES = path.join(HERE, 'images');
const ORIGINALS = path.join(IMAGES, 'original');
const CSV = path.join(HERE, 'labels.csv');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

// The app's first compression step. Kept as a flag so the same photographs can
// be re-derived at another width — image resolution is itself something we want
// to measure, and re-shooting to test it would be absurd.
const WIDTH = parseInt(arg('width', '1024'), 10);
const QUALITY = parseInt(arg('quality', '70'), 10);

const PHOTO = /\.(jpe?g|png|heic|heif|webp)$/i;

const CSV_HEADER = [
  'id', 'obverse_file', 'reverse_file',
  'year', 'mintMark', 'denomination', 'country', 'design', 'category',
  'tags', 'verified', 'goldSource',
].join(',');

async function ingest(from) {
  if (!existsSync(from)) throw new Error(`No such folder: ${from}`);
  const names = (await readdir(from)).filter((f) => PHOTO.test(f)).sort();

  const heic = names.filter((f) => /\.hei[cf]$/i.test(f));
  if (heic.length) {
    console.error(
      `\n${heic.length} HEIC file(s) found. sharp cannot read them here.\n` +
        `On iPhone: Settings > Camera > Formats > Most Compatible, then re-shoot,\n` +
        `or export the folder as JPEG first.\n`
    );
    process.exit(1);
  }
  if (!names.length) throw new Error(`No photos in ${from}`);
  if (names.length % 2 !== 0) {
    console.error(
      `\n${names.length} photos — an odd number, so at least one coin is missing a side.\n` +
        `Expected obverse then reverse for each coin, in shooting order.\n`
    );
    process.exit(1);
  }

  await mkdir(ORIGINALS, { recursive: true });
  const rows = [];
  const cards = [];
  const small = [];

  for (let i = 0; i < names.length; i += 2) {
    const n = String(i / 2 + 1).padStart(2, '0');
    const id = `coin-${n}`;
    const pair = [
      { src: names[i], side: 'obv' },
      { src: names[i + 1], side: 'rev' },
    ];

    for (const { src, side } of pair) {
      await copyFile(path.join(from, src), path.join(ORIGINALS, src));
      const out = path.join(IMAGES, `${id}-${side}.jpg`);

      // A photo that arrives already downscaled is the failure that hides
      // itself: the baseline still runs, so nothing looks wrong until the
      // 1568px comparison turns out to be underivable and the coins have long
      // since gone back in the drawer. Emailing at less than "Actual Size" is
      // the usual cause.
      const info = await sharp(path.join(from, src)).metadata();
      if (Math.max(info.width ?? 0, info.height ?? 0) < 1600) {
        small.push(`${src} (${info.width}x${info.height})`);
      }

      await sharp(path.join(from, src))
        .rotate() // honour EXIF orientation; a sideways coin is a harder coin
        .resize({ width: WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY })
        .toFile(out);
    }

    rows.push([id, names[i], names[i + 1], '', '', '', '', '', '', '', 'false', ''].join(','));
    cards.push(
      `<figure><figcaption><b>${id}</b><br><small>${names[i]} / ${names[i + 1]}</small></figcaption>` +
        `<img src="${id}-obv.jpg"><img src="${id}-rev.jpg"></figure>`
    );
  }

  const count = names.length / 2;
  if (existsSync(CSV)) {
    console.error(`\nlabels.csv already exists — not overwriting it.\nDelete it first if you meant to start over.\n`);
    process.exit(1);
  }
  await writeFile(CSV, CSV_HEADER + '\n' + rows.join('\n') + '\n');
  await writeFile(
    path.join(IMAGES, 'pairs.html'),
    `<!doctype html><meta charset="utf-8"><title>Coin pairs</title><style>
     body{font:14px system-ui;background:#111;color:#eee;margin:24px}
     figure{display:flex;gap:12px;align-items:center;margin:0 0 20px;padding:12px;background:#1c1c1c;border-radius:8px}
     figcaption{width:220px} img{height:150px;border-radius:6px;background:#000}
     </style><h1>${count} coins — check each row is one coin, obverse and reverse</h1>${cards.join('\n')}`
  );

  if (small.length) {
    const shown = small.slice(0, 6).map((f) => '    ' + f).join('\n');
    const more = small.length > 6 ? `\n    ...and ${small.length - 6} more` : '';
    console.warn(
      `\nWARNING - ${small.length} photo(s) are under 1600px on the long edge:\n` +
        shown + more +
        `\n\n  These still work for the ${WIDTH}px baseline, but they cannot be\n` +
        `  re-derived at 1568px, so the image-resolution comparison would need\n` +
        `  re-shooting. Usual cause: emailed at less than "Actual Size", or a\n` +
        `  sync set to "optimise storage". USB or full-resolution OneDrive avoids it.\n`
    );
  }

  console.log(
    `\n${count} coins ingested at ${WIDTH}px.\n\n` +
      `  1. Open  eval/coin-recognition/images/pairs.html  and confirm each row is\n` +
      `     one coin's two sides. If a pair is wrong, the photos were out of order.\n` +
      `  2. Fill in eval/coin-recognition/labels.csv from the COINS, not the photos.\n` +
      `     Leave a cell blank if you cannot confirm it — blank is skipped, not wrong.\n` +
      `  3. node eval/coin-recognition/ingest.mjs --build\n`
  );
}

/** Minimal CSV row splitter — handles "quoted, fields" for goldSource. */
function splitRow(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === ',' && !quoted) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function build() {
  if (!existsSync(CSV)) throw new Error(`No labels.csv — run with --from first.`);
  const lines = (await readFile(CSV, 'utf8')).split('\n').filter((l) => l.trim());
  const header = splitRow(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const cases = [];
  const warnings = [];

  for (const line of lines.slice(1)) {
    const c = splitRow(line);
    const get = (k) => (c[idx[k]] ?? '').trim();
    const id = get('id');
    if (!id) continue;

    const num = (k) => (get(k) === '' ? null : Number(get(k)));
    const str = (k) => (get(k) === '' ? null : get(k));

    const expected = {
      year: num('year'),
      mintMark: str('mintMark'),
      denomination: str('denomination'),
      country: str('country'),
      design: str('design'),
      category: str('category'),
    };

    const verified = get('verified').toLowerCase() === 'true';
    const filled = Object.values(expected).filter((v) => v !== null).length;

    if (filled === 0) warnings.push(`${id}: every field blank — this case scores nothing.`);
    if (!expected.denomination) warnings.push(`${id}: no denomination (it is written on the coin).`);
    if (!expected.country) warnings.push(`${id}: no country.`);
    if (verified && filled < 4) {
      warnings.push(`${id}: marked verified but only ${filled} field(s) filled.`);
    }
    if (expected.year != null && !Number.isInteger(expected.year)) {
      warnings.push(`${id}: year "${get('year')}" is not a whole number.`);
    }

    cases.push({
      id,
      obverse: `images/${id}-obv.jpg`,
      reverse: `images/${id}-rev.jpg`,
      tags: get('tags') ? get('tags').split(/\s*\|\s*/) : ['unsorted'],
      expected,
      goldSource: str('goldSource') ?? 'labelled from the physical coin',
      verified,
    });
  }

  await writeFile(path.join(HERE, 'cases.json'), JSON.stringify(cases, null, 2) + '\n');

  const verified = cases.filter((c) => c.verified).length;
  console.log(`\ncases.json written — ${cases.length} cases, ${verified} marked verified.`);
  if (warnings.length) {
    console.log(`\n${warnings.length} thing(s) to look at:`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (verified === 0) {
    console.log(
      `\nNothing is marked verified. The eval will still run, but treat the number\n` +
        `as provisional until the labels have been checked against the coins.`
    );
  }
  console.log('');
}

const from = arg('from', null);
if (process.argv.includes('--build')) await build();
else if (from) await ingest(from);
else {
  console.log(
    `\nUsage:\n` +
      `  node eval/coin-recognition/ingest.mjs --from "C:/path/to/photos" [--width 1024]\n` +
      `  node eval/coin-recognition/ingest.mjs --build\n`
  );
}
