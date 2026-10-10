import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { AchievementDefinition, AchievementTier } from '@coin-collecting/shared';

import { CoinDisc, DiscTone } from '../design';
import { palette } from '../../theme';

// Badges are struck like the coins they reward: the same disc the rest of the
// app uses, in the tier's metal. Platinum has no metal of its own, so it is
// silver with a bright rim.

const TIER_TONE: Record<AchievementTier, DiscTone> = {
  bronze: 'copper',
  silver: 'silver',
  gold: 'gold',
  platinum: 'silver',
};

export const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/** Short text stamped on badges whose threshold isn't a plain number. */
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

export function badgeStamp(achievement: AchievementDefinition): string {
  const stamp = STAMPS[achievement.id];
  if (stamp) return stamp;
  const { criterion } = achievement;
  if (criterion.kind === 'count' || criterion.kind === 'yearSpan') return String(criterion.atLeast);
  return '★';
}

interface Props {
  achievement: AchievementDefinition;
  earned: boolean;
  size?: number;
}

export const AchievementBadge: React.FC<Props> = ({ achievement, earned, size = 48 }) => {
  const platinum = achievement.tier === 'platinum';
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        platinum && { borderWidth: Math.max(1.5, size * 0.035), borderColor: palette.fg2 },
        !earned && styles.locked,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <CoinDisc
        size={platinum ? size - Math.max(3, size * 0.07) : size}
        label={badgeStamp(achievement)}
        tone={TIER_TONE[achievement.tier]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  locked: { opacity: 0.28 },
});
