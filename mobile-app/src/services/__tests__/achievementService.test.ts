// src/services/__tests__/achievementService.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS, evaluateAchievements } from '@coin-collecting/shared';

import { AchievementService, buildAchievementStatuses } from '../achievementService';
import { supabase } from '../supabase';
import { Coin } from '../../types/coin';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));

interface Row {
  achievement_id: string;
  unlocked_at: string;
}

/**
 * A stand-in for the user_achievements table: select returns what's stored,
 * upsert stores rows it hasn't seen and returns only those, like
 * ON CONFLICT DO NOTHING ... RETURNING.
 */
function fakeTable(options: { failLoad?: boolean; failSave?: boolean } = {}) {
  const stored = new Map<string, Row>();
  const upserts: Row[][] = [];

  (supabase.from as jest.Mock).mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        eq: async () =>
          options.failLoad
            ? { data: null, error: { message: 'offline' } }
            : { data: [...stored.values()], error: null },
      }),
    }),
    upsert: (rows: Row[]) => ({
      select: async () => {
        if (options.failSave) return { data: null, error: { message: 'offline' } };
        const inserted = rows.filter(row => !stored.has(row.achievement_id));
        for (const row of inserted) stored.set(row.achievement_id, row);
        upserts.push(rows);
        return { data: inserted, error: null };
      },
    }),
  }));

  return { stored, upserts };
}

let counter = 0;
function makeCoin(overrides: Partial<Coin> = {}): Coin {
  counter += 1;
  return {
    id: `coin-${counter}`,
    name: 'Test Coin',
    title: '',
    year: 2000,
    mintMark: null,
    grade: null,
    faceValue: null,
    purchasePrice: null,
    currentMarketValue: null,
    lastValueUpdate: null,
    pcgsId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
    collectionId: 'collection-1',
    denomination: 'Quarter',
    category: null,
    purchaseDate: null,
    personalValue: null,
    lastAppraisalValue: null,
    lastAppraisalDate: null,
    mintage: null,
    rarityScale: null,
    historicalNotes: null,
    varietyNotes: null,
    notes: null,
    images: null,
    obverseImage: null,
    reverseImage: null,
    country: 'United States',
    series: null,
    seriesId: null,
    specificCoinId: null,
    specificCoinName: null,
    designer: null,
    theme: null,
    honoree: null,
    releaseDate: null,
    certificationNumber: null,
    gradingService: null,
    ...overrides,
  };
}

const coins = (n: number) => Array.from({ length: n }, () => makeCoin());
// Joined after the Founding Collector cutoff, so it stays out of the way.
const user = { id: 'user-1', created_at: '2028-01-01T00:00:00Z' };

beforeEach(async () => {
  await AsyncStorage.clear();
  (supabase.from as jest.Mock).mockReset();
});

describe('buildAchievementStatuses', () => {
  const progress = evaluateAchievements({ coins: [], albums: [], accountCreatedAt: null });

  it('keeps a saved badge earned even when the collection no longer meets it', () => {
    const statuses = buildAchievementStatuses(progress, new Map([['coins_10', '2026-10-01T00:00:00Z']]));
    expect(statuses.find(s => s.id === 'coins_10')).toMatchObject({
      earned: true,
      unlockedAt: '2026-10-01T00:00:00Z',
      current: 0,
    });
  });

  it('marks a met badge earned before it is saved', () => {
    const met = evaluateAchievements({ coins: coins(1), albums: [], accountCreatedAt: null });
    expect(buildAchievementStatuses(met, new Map()).find(s => s.id === 'coins_1')).toMatchObject({
      earned: true,
      unlockedAt: null,
    });
  });

  it('returns every definition in order', () => {
    expect(buildAchievementStatuses(progress, new Map()).map(s => s.id)).toEqual(
      ACHIEVEMENTS.map(a => a.id)
    );
  });
});

describe('AchievementService.check', () => {
  it('unlocks quietly on the first check, then celebrates later unlocks', async () => {
    const table = fakeTable();

    const first = await AchievementService.check(coins(3), user);
    expect(first.newlyUnlocked).toEqual([]);
    expect(table.stored.has('coins_1')).toBe(true);

    const second = await AchievementService.check(coins(10), user);
    expect(second.newlyUnlocked.map(a => a.id)).toEqual(['coins_10']);
    expect(second.earnedCount).toBe(2);
  });

  it('finishes the quiet first check even with nothing to unlock', async () => {
    fakeTable();
    await AchievementService.check([], user);
    const next = await AchievementService.check(coins(1), user);
    expect(next.newlyUnlocked.map(a => a.id)).toEqual(['coins_1']);
  });

  it('does not save again what is already saved', async () => {
    const table = fakeTable();
    await AchievementService.check(coins(1), user);
    await AchievementService.check(coins(1), user);
    expect(table.upserts).toHaveLength(1);
  });

  it('celebrates only rows this check inserted', async () => {
    const table = fakeTable();
    await AchievementService.check([], user);
    // Another device saved the badge between this device's read and write.
    const realFrom = (supabase.from as jest.Mock).getMockImplementation()!;
    (supabase.from as jest.Mock).mockImplementation(() => {
      const builder = realFrom();
      return {
        ...builder,
        select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      };
    });
    table.stored.set('coins_1', { achievement_id: 'coins_1', unlocked_at: '2026-10-09T00:00:00Z' });

    const result = await AchievementService.check(coins(1), user);
    expect(result.newlyUnlocked).toEqual([]);
  });

  it('shows live progress without saving when unlocks cannot be read', async () => {
    const table = fakeTable({ failLoad: true });
    const result = await AchievementService.check(coins(1), user);
    expect(table.upserts).toHaveLength(0);
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.achievements.find(a => a.id === 'coins_1')?.earned).toBe(true);
  });

  it('keeps the first check quiet until its unlocks are saved', async () => {
    fakeTable({ failSave: true });
    await AchievementService.check(coins(1), user);

    // Back online: this is still the first successful check, so still quiet.
    fakeTable();
    const result = await AchievementService.check(coins(1), user);
    expect(result.newlyUnlocked).toEqual([]);
  });

  it('runs overlapping checks one at a time', async () => {
    const table = fakeTable();
    await AchievementService.check([], user);
    const [a, b] = await Promise.all([
      AchievementService.check(coins(1), user),
      AchievementService.check(coins(1), user),
    ]);
    expect([...a.newlyUnlocked, ...b.newlyUnlocked].map(x => x.id)).toEqual(['coins_1']);
    expect(table.upserts).toHaveLength(1);
  });

  it('earns Founding Collector for an early account', async () => {
    fakeTable();
    const result = await AchievementService.check([], { id: 'user-1', created_at: '2026-10-07T00:00:00Z' });
    expect(result.achievements.find(a => a.id === 'founding_collector')?.earned).toBe(true);
  });
});
