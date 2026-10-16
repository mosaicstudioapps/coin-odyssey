// src/services/achievementService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAchievementChecker,
  type AchievementSeedFlag,
  type AchievementSnapshot,
  type AchievementUnlockStore,
  type AchievementUser,
} from '@coin-collecting/shared';

import { supabase } from './supabase';
import { Logger } from './logger';
import { Coin } from '../types/coin';

// Mobile storage for the shared achievement rules (packages/shared,
// utils/achievementSync.ts): unlocks in the user_achievements table, and the
// "first check done" flag in AsyncStorage. The rules themselves (quiet first
// check, celebrate only what this check inserted, badges stay earned) live in
// shared so the web app behaves the same.

export type { AchievementStatus, AchievementSnapshot, AchievementUser } from '@coin-collecting/shared';
export { buildAchievementStatuses } from '@coin-collecting/shared';

const SEEDED_KEY_PREFIX = 'achievements_seeded_v1:';

const unlocks: AchievementUnlockStore = {
  async load(userId) {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (error) {
      Logger.warn('Could not load achievements', { error: error.message });
      return null;
    }
    const saved = new Map<string, string>();
    for (const row of data ?? []) {
      saved.set(row.achievement_id, row.unlocked_at ?? new Date().toISOString());
    }
    return saved;
  },

  async save(userId, progress) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_achievements')
      .upsert(
        progress.map(p => ({
          user_id: userId,
          achievement_id: p.id,
          is_completed: true,
          unlocked_at: now,
          progress: { current: p.current, required: p.required },
        })),
        { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
      )
      .select('achievement_id, unlocked_at');

    if (error) {
      Logger.warn('Could not save achievements', { error: error.message });
      return [];
    }
    return (data ?? []).map(row => ({ id: row.achievement_id, unlockedAt: row.unlocked_at ?? now }));
  },
};

const seedFlag: AchievementSeedFlag = {
  async isSeeded(userId) {
    try {
      return (await AsyncStorage.getItem(SEEDED_KEY_PREFIX + userId)) === '1';
    } catch {
      // Unreadable storage: treat as seeded. Worst case is one extra
      // celebration, which beats silently swallowing a real unlock.
      return true;
    }
  },
  async markSeeded(userId) {
    try {
      await AsyncStorage.setItem(SEEDED_KEY_PREFIX + userId, '1');
    } catch (err) {
      Logger.warn('Could not record the first achievements check', err);
    }
  },
};

const checker = createAchievementChecker({ unlocks, seedFlag });

export const AchievementService = {
  check(coins: Coin[], user: AchievementUser): Promise<AchievementSnapshot> {
    return checker.check(coins, user);
  },
};
