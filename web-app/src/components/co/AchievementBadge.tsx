import {
  ACHIEVEMENT_TIER_LABELS,
  ACHIEVEMENT_TIER_METAL,
  achievementStamp,
  type AchievementDefinition,
} from '@coin-collecting/shared';
import { cn } from '@/lib/utils';
import { CoinDisc } from './primitives';

/** A badge struck like a coin, from the same shared rules as the mobile badge. */
export function AchievementBadge({
  achievement,
  earned,
  size = 48,
}: {
  achievement: AchievementDefinition;
  earned: boolean;
  size?: number;
}) {
  const platinum = achievement.tier === 'platinum';
  const ring = Math.max(1.5, size * 0.035);
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', !earned && 'opacity-[0.28]')}
      style={{
        width: size,
        height: size,
        boxShadow: platinum ? `0 0 0 ${ring}px var(--co-fg2)` : undefined,
      }}
      role="img"
      aria-label={`${achievement.title}, ${ACHIEVEMENT_TIER_LABELS[achievement.tier]}${earned ? '' : ', not yet earned'}`}
    >
      <CoinDisc size={size} label={achievementStamp(achievement)} tone={ACHIEVEMENT_TIER_METAL[achievement.tier]} />
    </span>
  );
}
