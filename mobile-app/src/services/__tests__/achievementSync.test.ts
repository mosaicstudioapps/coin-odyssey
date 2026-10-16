// src/services/__tests__/achievementSync.test.ts
//
// The shared achievement rules on their own, with in-memory storage, the way
// any app (mobile or web) plugs them in.
import {
  createAchievementChecker,
  type AchievementSeedFlag,
  type AchievementUnlockStore,
  type Coin,
} from '@coin-collecting/shared';

function memoryStores(options: { failLoad?: boolean; failSave?: boolean } = {}) {
  const rows = new Map<string, string>();
  const seeded = new Set<string>();
  const unlocks: AchievementUnlockStore = {
    async load() {
      return options.failLoad ? null : new Map(rows);
    },
    async save(_userId, progress) {
      if (options.failSave) return [];
      const inserted = progress.filter(p => !rows.has(p.id)).map(p => ({ id: p.id, unlockedAt: '2026-10-15T00:00:00Z' }));
      for (const row of inserted) rows.set(row.id, row.unlockedAt);
      return inserted;
    },
  };
  const seedFlag: AchievementSeedFlag = {
    async isSeeded(userId) {
      return seeded.has(userId);
    },
    async markSeeded(userId) {
      seeded.add(userId);
    },
  };
  return { unlocks, seedFlag, rows, seeded };
}

const coin = (overrides: Partial<Coin> = {}): Coin =>
  ({
    id: Math.random().toString(36),
    name: 'Coin',
    title: '',
    year: 2000,
    denomination: 'Quarter',
    country: 'United States',
    category: null,
    notes: null,
    source: null,
    mintMark: null,
    seriesId: null,
    specificCoinId: null,
    specificCoinName: null,
    ...overrides,
  }) as Coin;

const coins = (n: number) => Array.from({ length: n }, () => coin());
const user = { id: 'u1', created_at: '2028-01-01T00:00:00Z' };

describe('createAchievementChecker', () => {
  it('is quiet on the first check, then reports new unlocks', async () => {
    const stores = memoryStores();
    const checker = createAchievementChecker(stores);
    expect((await checker.check(coins(1), user)).newlyUnlocked).toEqual([]);
    expect(stores.seeded.has('u1')).toBe(true);
    const next = await checker.check(coins(10), user);
    expect(next.newlyUnlocked.map(a => a.id)).toEqual(['coins_10']);
  });

  it('keeps saved badges earned after their coins are gone', async () => {
    const stores = memoryStores();
    const checker = createAchievementChecker(stores);
    await checker.check(coins(10), user);
    const after = await checker.check([], user);
    expect(after.achievements.find(a => a.id === 'coins_10')).toMatchObject({ earned: true, current: 0 });
  });

  it('saves nothing when saved unlocks cannot be read', async () => {
    const stores = memoryStores({ failLoad: true });
    const result = await createAchievementChecker(stores).check(coins(1), user);
    expect(stores.rows.size).toBe(0);
    expect(result.achievements.find(a => a.id === 'coins_1')?.earned).toBe(true);
  });

  it('stays quiet until the first check has saved everything', async () => {
    const stores = memoryStores({ failSave: true });
    await createAchievementChecker(stores).check(coins(1), user);
    expect(stores.seeded.has('u1')).toBe(false);
  });

  it('keeps each checker independent, so apps and tests don’t share a queue', async () => {
    const a = createAchievementChecker(memoryStores());
    const b = createAchievementChecker(memoryStores());
    await a.check([], user);
    expect((await b.check(coins(1), user)).newlyUnlocked).toEqual([]);
  });
});
