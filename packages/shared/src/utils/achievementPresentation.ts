import type { AchievementDefinition, AchievementTier } from '../types/achievement';

// How a badge looks, shared so the mobile and web badges match. A badge is
// struck like a coin: the tier sets the metal, the stamp is the short text on
// its face. (Mobile's AchievementBadge keeps its own copy until Phase 1 of the
// web plan; achievements.test.ts checks the two agree.)

export const ACHIEVEMENT_TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/** Disc metal per tier. Platinum is silver with a bright rim. */
export const ACHIEVEMENT_TIER_METAL: Record<AchievementTier, 'gold' | 'silver' | 'copper'> = {
  bronze: 'copper',
  silver: 'silver',
  gold: 'gold',
  platinum: 'silver',
};

const STAMPS: Record<string, string> = {
  before_1900: '1800s',
  before_1800: '1700s',
  ancient: 'ANC',
  album_first_slot: '1ST',
  album_section: 'PAGE',
  album_complete: 'FULL',
  album_state_quarters: '50',
  album_awq: 'AWQ',
  album_atb: 'ATB',
  notes_5: 'NOTE',
  founding_collector: '2026',
  first_scan: 'SCAN',
};

/** Short text on the badge's face: a threshold number, or a named stamp. */
export function achievementStamp(achievement: AchievementDefinition): string {
  const stamp = STAMPS[achievement.id];
  if (stamp) return stamp;
  const { criterion } = achievement;
  if (criterion.kind === 'count' || criterion.kind === 'yearSpan') return String(criterion.atLeast);
  return '★';
}
