// src/services/achievementService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENTS,
  AchievementDefinition,
  AchievementProgress,
  buildAlbums,
  evaluateAchievements,
} from '@coin-collecting/shared';

import { supabase } from './supabase';
import { Logger } from './logger';
import { summarizeAlbumsForAchievements } from './albumService';
import { Coin } from '../types/coin';

// Achievements are worked out on the device from the collection, the same
// way album fills are. Only the unlock is stored, with its date, in
// user_achievements, so a badge stays earned even if the coins behind it are
// later deleted.
//
// The first check for an account unlocks everything it already qualifies for
// quietly. Without that, everyone updating to 1.1 would sit through a stack
// of celebrations for coins they added months ago. Every check after that
// reports what it unlocked, for the app to celebrate.

export interface AchievementStatus extends AchievementDefinition {
  current: number;
  required: number;
  /** Met now, or unlocked earlier. */
  earned: boolean;
  /** When the unlock was saved, or null if it hasn't been. */
  unlockedAt: string | null;
}

export interface AchievementSnapshot {
  achievements: AchievementStatus[];
  earnedCount: number;
  /** Saved by this check and worth celebrating. Always empty on the first check. */
  newlyUnlocked: AchievementDefinition[];
}

/** The parts of a Supabase user the check reads. */
export interface AchievementUser {
  id: string;
  created_at?: string | null;
}

const SEEDED_KEY_PREFIX = 'achievements_seeded_v1:';

/**
 * Merge live progress with saved unlocks. Pure, so the "stays earned" rule
 * is tested without a database.
 */
export function buildAchievementStatuses(
  progress: AchievementProgress[],
  unlockedAt: ReadonlyMap<string, string>,
  definitions: readonly AchievementDefinition[] = ACHIEVEMENTS
): AchievementStatus[] {
  const byId = new Map(progress.map(p => [p.id, p]));
  return definitions.map(definition => {
    const p = byId.get(definition.id);
    const savedAt = unlockedAt.get(definition.id) ?? null;
    return {
      ...definition,
      current: p?.current ?? 0,
      required: p?.required ?? 1,
      earned: Boolean(p?.met) || savedAt !== null,
      unlockedAt: savedAt,
    };
  });
}

export class AchievementService {
  /** Checks run one at a time, so two saves in a row can't unlock a badge twice. */
  private static queue: Promise<unknown> = Promise.resolve();

  static check(coins: Coin[], user: AchievementUser): Promise<AchievementSnapshot> {
    const run = this.queue.catch(() => undefined).then(() => this.runCheck(coins, user));
    this.queue = run;
    return run;
  }

  private static async runCheck(coins: Coin[], user: AchievementUser): Promise<AchievementSnapshot> {
    const progress = evaluateAchievements({
      coins,
      albums: summarizeAlbumsForAchievements(buildAlbums(), coins),
      accountCreatedAt: user.created_at ?? null,
    });

    const saved = await this.loadUnlocks(user.id);
    if (!saved) {
      // Couldn't read what's saved (offline, usually). Show live progress and
      // try again on the next check; saving blind could re-celebrate.
      return this.snapshot(progress, new Map(), []);
    }

    const toUnlock = progress.filter(p => p.met && !saved.has(p.id));
    const inserted = toUnlock.length > 0 ? await this.saveUnlocks(user.id, toUnlock) : [];
    for (const row of inserted) saved.set(row.id, row.unlockedAt);

    const seeded = await this.isSeeded(user.id);
    const savedAll = inserted.length === toUnlock.length;
    if (!seeded && savedAll) await this.markSeeded(user.id);

    const newlyUnlocked = seeded
      ? inserted
          .map(row => ACHIEVEMENTS.find(a => a.id === row.id))
          .filter((a): a is AchievementDefinition => Boolean(a))
      : [];

    return this.snapshot(progress, saved, newlyUnlocked);
  }

  private static snapshot(
    progress: AchievementProgress[],
    saved: ReadonlyMap<string, string>,
    newlyUnlocked: AchievementDefinition[]
  ): AchievementSnapshot {
    const achievements = buildAchievementStatuses(progress, saved);
    return {
      achievements,
      earnedCount: achievements.filter(a => a.earned).length,
      newlyUnlocked,
    };
  }

  /** Saved unlocks by id, or null when they couldn't be read. */
  private static async loadUnlocks(userId: string): Promise<Map<string, string> | null> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (error) {
      Logger.warn('Could not load achievements', { error: error.message });
      return null;
    }
    const unlocks = new Map<string, string>();
    for (const row of data ?? []) {
      unlocks.set(row.achievement_id, row.unlocked_at ?? new Date().toISOString());
    }
    return unlocks;
  }

  /**
   * Insert unlock rows, skipping any that already exist. Returns only the
   * rows this call actually inserted, so a badge saved by a parallel check
   * (another device, say) isn't celebrated twice.
   */
  private static async saveUnlocks(
    userId: string,
    progress: AchievementProgress[]
  ): Promise<{ id: string; unlockedAt: string }[]> {
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
  }

  private static async isSeeded(userId: string): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(SEEDED_KEY_PREFIX + userId)) === '1';
    } catch {
      // Unreadable storage: treat as seeded. Worst case is one extra
      // celebration, which beats silently swallowing a real unlock.
      return true;
    }
  }

  private static async markSeeded(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SEEDED_KEY_PREFIX + userId, '1');
    } catch (err) {
      Logger.warn('Could not record the first achievements check', err);
    }
  }
}
