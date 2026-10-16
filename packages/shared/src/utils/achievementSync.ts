// The rules for turning achievement progress into saved unlocks, shared so
// mobile and web behave identically. Storage is passed in: each app supplies
// its own database access and its own place to remember the first check
// (AsyncStorage on mobile, localStorage on web).
//
// The rules:
// - Progress is worked out from the collection; only unlocks are saved, with
//   their date, so a badge stays earned even if its coins are later deleted.
// - The first check for an account unlocks everything it already qualifies
//   for quietly, so people arriving with an existing collection don't get a
//   stack of celebrations. Later checks report what they unlocked.
// - Only rows this check actually inserted are celebrated, so a badge saved by
//   another device or a parallel check isn't celebrated twice.
// - If saved unlocks can't be read (usually offline), show live progress and
//   save nothing; saving blind could re-celebrate.
// - Checks run one at a time.
import type { AchievementDefinition, AchievementProgress } from '../types/achievement';
import type { Coin } from '../types/coin';
import { ACHIEVEMENTS } from '../data/achievements';
import { buildAlbums } from '../data/albums';
import { evaluateAchievements } from './achievements';
import { summarizeAlbumsForAchievements } from './albumFills';

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

/** The parts of a signed-in user the check reads. */
export interface AchievementUser {
  id: string;
  created_at?: string | null;
}

/** Where unlocks are saved. Both apps back this with the user_achievements table. */
export interface AchievementUnlockStore {
  /** Saved unlock dates by achievement id, or null when they couldn't be read. */
  load(userId: string): Promise<Map<string, string> | null>;
  /**
   * Save unlocks, skipping any that already exist. Resolve to only the rows
   * this call inserted. Resolve to [] if the save failed.
   */
  save(userId: string, progress: AchievementProgress[]): Promise<{ id: string; unlockedAt: string }[]>;
}

/** Remembers, per account on this device, that the quiet first check is done. */
export interface AchievementSeedFlag {
  isSeeded(userId: string): Promise<boolean>;
  markSeeded(userId: string): Promise<void>;
}

/**
 * Merge live progress with saved unlocks. A saved unlock keeps a badge
 * earned even when the collection no longer meets it.
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

function snapshot(
  progress: AchievementProgress[],
  saved: ReadonlyMap<string, string>,
  newlyUnlocked: AchievementDefinition[]
): AchievementSnapshot {
  const achievements = buildAchievementStatuses(progress, saved);
  return { achievements, earnedCount: achievements.filter(a => a.earned).length, newlyUnlocked };
}

export interface AchievementChecker {
  check(coins: Coin[], user: AchievementUser): Promise<AchievementSnapshot>;
}

export function createAchievementChecker(deps: {
  unlocks: AchievementUnlockStore;
  seedFlag: AchievementSeedFlag;
}): AchievementChecker {
  let queue: Promise<unknown> = Promise.resolve();

  async function runCheck(coins: Coin[], user: AchievementUser): Promise<AchievementSnapshot> {
    const progress = evaluateAchievements({
      coins,
      albums: summarizeAlbumsForAchievements(buildAlbums(), coins),
      accountCreatedAt: user.created_at ?? null,
    });

    const saved = await deps.unlocks.load(user.id);
    if (!saved) return snapshot(progress, new Map(), []);

    const toUnlock = progress.filter(p => p.met && !saved.has(p.id));
    const inserted = toUnlock.length > 0 ? await deps.unlocks.save(user.id, toUnlock) : [];
    for (const row of inserted) saved.set(row.id, row.unlockedAt);

    const seeded = await deps.seedFlag.isSeeded(user.id);
    if (!seeded && inserted.length === toUnlock.length) await deps.seedFlag.markSeeded(user.id);

    const newlyUnlocked = seeded
      ? inserted
          .map(row => ACHIEVEMENTS.find(a => a.id === row.id))
          .filter((a): a is AchievementDefinition => Boolean(a))
      : [];

    return snapshot(progress, saved, newlyUnlocked);
  }

  return {
    check(coins, user) {
      const run = queue.catch(() => undefined).then(() => runCheck(coins, user));
      queue = run;
      return run;
    },
  };
}
