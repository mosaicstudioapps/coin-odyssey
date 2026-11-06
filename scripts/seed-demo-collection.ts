// Seeds the App Review demo account with a small sample collection, so
// reviewers see filled album slots instead of an empty app.
//
//   npx tsx scripts/seed-demo-collection.ts            dry run: shows what each coin fills
//   npx tsx scripts/seed-demo-collection.ts --write    signs in as the demo account and adds them
//
// Reads EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY and EVAL_DEMO_EMAIL / _PASSWORD
// from mobile-app/.env. It signs in as the demo account, so row-level security
// applies exactly as in the app, and it refuses to add anything if the account
// already has coins.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  albumInView,
  buildSlotAssignment,
  coinToRow,
  computeAlbumFills,
  getAlbumById,
  type Album,
  type Coin,
} from '@coin-collecting/shared';

type Sample = Partial<Coin> & { name: string; year: number };

function env(): Record<string, string> {
  const text = readFileSync(resolve(__dirname, '../mobile-app/.env'), 'utf8');
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(line => /^[A-Z_]+=/.test(line))
      .map(line => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, '')];
      })
  );
}

function album(id: string, view?: 'mint'): Album {
  const found = getAlbumById(id);
  if (!found) throw new Error(`No album ${id}`);
  return view ? albumInView(found, view) : found;
}

const allSlots = (a: Album) => a.sections.flatMap(section => section.slots);

/** A coin tagged to a series album's slot, the way "fill this slot" does it. */
function tagged(albumId: string, slotLabel: RegExp, mint: 'P' | 'D', extra: Partial<Coin>): Sample {
  const a = album(albumId, 'mint');
  const slot = allSlots(a).find(s => slotLabel.test(s.label) && s.id.endsWith(`__${mint}`));
  if (!slot) throw new Error(`No ${mint} slot matching ${slotLabel} in ${albumId}`);
  const assignment = buildSlotAssignment(a, slot);
  if (!assignment) throw new Error(`Slot ${slot.id} can't be assigned`);
  const year = slot.match.kind === 'country' ? 0 : slot.match.year;
  return {
    ...assignment,
    name: `${year} ${assignment.specificCoinName ?? slot.label}`,
    year,
    mintMark: mint,
    country: 'United States',
    ...extra,
  } as Sample;
}

const QUARTER: Partial<Coin> = { denomination: 'Quarter', faceValue: 0.25, category: 'commemorative' };
const us = (coin: Sample): Sample => ({ country: 'United States', category: 'circulating', ...coin });

const SAMPLES: Sample[] = [
  tagged('state_quarters', /delaware/i, 'P', QUARTER),
  tagged('state_quarters', /pennsylvania/i, 'D', QUARTER),
  tagged('state_quarters', /georgia/i, 'P', QUARTER),
  tagged('state_quarters', /virginia/i, 'D', QUARTER),
  tagged('atb_quarters', /yellowstone/i, 'P', QUARTER),
  tagged('awq', /angelou/i, 'D', QUARTER),
  us({ name: '2010 Lincoln Shield Cent', year: 2010, mintMark: 'P', denomination: 'Cent', faceValue: 0.01 }),
  us({ name: '2019 Lincoln Shield Cent', year: 2019, mintMark: 'D', denomination: 'Cent', faceValue: 0.01 }),
  us({ name: '1999 Lincoln Memorial Cent', year: 1999, mintMark: 'D', denomination: 'Cent', faceValue: 0.01 }),
  us({ name: '2006 Jefferson Nickel', year: 2006, mintMark: 'P', denomination: 'Nickel', faceValue: 0.05 }),
  us({ name: '1999 Roosevelt Dime', year: 1999, mintMark: 'P', denomination: 'Dime', faceValue: 0.1 }),
  us({ name: '1971 Kennedy Half Dollar', year: 1971, mintMark: 'D', denomination: 'Half Dollar', faceValue: 0.5 }),
  {
    name: '2012 Canada Quarter',
    year: 2012,
    mintMark: 'NONE',
    denomination: 'Quarter',
    faceValue: 0.25,
    country: 'Canada',
    category: 'circulating',
  },
];

const ALBUM_IDS = [
  'state_quarters',
  'atb_quarters',
  'awq',
  'lincoln_memorial',
  'lincoln_shield',
  'jefferson_nickels',
  'roosevelt_dimes',
  'kennedy_halves',
  'world',
];

function dryRun(): void {
  const coins = SAMPLES.map((s, i) => ({ ...s, id: `sample-${i}` }) as Coin);
  const filled = new Map<string, string[]>();
  for (const id of ALBUM_IDS) {
    const base = album(id);
    const a = base.mintVariants ? albumInView(base, 'mint') : base;
    for (const [slotId, fill] of computeAlbumFills(a, coins)) {
      const list = filled.get(fill.coin.id) ?? [];
      list.push(`${a.title}: ${allSlots(a).find(s => s.id === slotId)?.label ?? slotId}`);
      filled.set(fill.coin.id, list);
    }
  }
  for (const coin of coins) {
    const where = filled.get(coin.id);
    console.log(`${where ? 'OK  ' : 'MISS'} ${coin.name} (${coin.year} ${coin.mintMark}) -> ${where?.join('; ') ?? 'no album slot'}`);
  }
}

async function write(): Promise<void> {
  const e = env();
  const url = e.EXPO_PUBLIC_SUPABASE_URL;
  const anon = e.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e.EVAL_DEMO_EMAIL, password: e.EVAL_DEMO_PASSWORD }),
  });
  if (!auth.ok) throw new Error(`Demo sign-in failed: ${auth.status}`);
  const { access_token: token, user } = (await auth.json()) as { access_token: string; user: { id: string } };
  const headers = { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const rest = (path: string, init?: RequestInit) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init?.headers } });

  let collections = (await (await rest(`collections?select=id&user_id=eq.${user.id}`)).json()) as { id: string }[];
  if (!collections.length) {
    const created = await rest('collections', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: user.id, name: 'My Coin Collection' }),
    });
    if (!created.ok) throw new Error(`Could not create the collection: ${created.status} ${await created.text()}`);
    collections = (await created.json()) as { id: string }[];
  }
  const collectionId = collections[0].id;

  const existing = (await (await rest(`coins?select=id&collection_id=eq.${collectionId}`)).json()) as unknown[];
  if (existing.length) throw new Error(`The demo collection already has ${existing.length} coins; not adding more.`);

  // A bulk insert needs every row to carry the same columns.
  const partial = SAMPLES.map(s => ({ ...coinToRow(s), collection_id: collectionId }));
  const columns = [...new Set(partial.flatMap(row => Object.keys(row)))];
  const rows = partial.map(row => Object.fromEntries(columns.map(c => [c, row[c] ?? null])));
  const inserted = await rest('coins', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  if (!inserted.ok) throw new Error(`Insert failed: ${inserted.status} ${await inserted.text()}`);
  console.log(`Added ${rows.length} coins to the demo collection.`);
}

if (process.argv.includes('--write')) {
  write().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  dryRun();
}
