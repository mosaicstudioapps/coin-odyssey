import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  ACHIEVEMENT_TIER_METAL,
  achievementStamp,
  type AchievementDefinition,
} from '@coin-collecting/shared';

import { CoinDisc } from '../design';
import { useTheme } from '../../theme';

// Badges are struck like the coins they reward: the same disc the rest of the
// app uses, in the tier's metal. Platinum has no metal of its own, so it is
// silver with a bright rim.

interface Props {
  achievement: AchievementDefinition;
  earned: boolean;
  size?: number;
}

export const AchievementBadge: React.FC<Props> = ({ achievement, earned, size = 48 }) => {
  const { palette } = useTheme();
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
        label={achievementStamp(achievement)}
        tone={ACHIEVEMENT_TIER_METAL[achievement.tier]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  locked: { opacity: 0.28 },
});
