import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ACHIEVEMENT_GROUPS, ACHIEVEMENT_GROUP_TITLES } from '@coin-collecting/shared';

import { palette, fontFamily } from '../../theme';
import { Card, Eyebrow, Icon, ProgressBar } from '../../components/design';
import { AchievementBadge, TIER_LABEL } from '../../components/achievements/AchievementBadge';
import { useAchievements } from '../../contexts/AchievementsContext';
import type { AchievementStatus } from '../../services/achievementService';

function formatUnlocked(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function AchievementRow({ achievement, first }: { achievement: AchievementStatus; first: boolean }) {
  const { earned, current, required, unlockedAt } = achievement;
  // A plain yes/no badge has nothing worth drawing a bar for.
  const showBar = !earned && required > 1;
  const status = earned
    ? unlockedAt
      ? `Earned ${formatUnlocked(unlockedAt)}`
      : 'Earned'
    : showBar
      ? `${Math.min(current, required)} / ${required}`
      : 'Not yet';

  return (
    <View
      style={[styles.row, !first && styles.rowDivider]}
      accessible
      accessibilityLabel={`${achievement.title}, ${TIER_LABEL[achievement.tier]}. ${achievement.description}. ${status}.`}
    >
      <AchievementBadge achievement={achievement} earned={earned} size={48} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, !earned && styles.rowTitleLocked]} numberOfLines={1}>
            {achievement.title}
          </Text>
          <Text style={styles.rowTier}>{TIER_LABEL[achievement.tier].toUpperCase()}</Text>
        </View>
        <Text style={styles.rowDescription}>{achievement.description}</Text>
        {showBar && (
          <View style={styles.rowBar}>
            <ProgressBar value={current / required} height={3} />
          </View>
        )}
        <Text style={[styles.rowStatus, earned && styles.rowStatusEarned]}>{status}</Text>
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { snapshot, refresh } = useAchievements();
  const [refreshing, setRefreshing] = useState(false);

  const groups = useMemo(() => {
    const achievements = snapshot?.achievements ?? [];
    return ACHIEVEMENT_GROUPS.map(group => ({
      group,
      items: achievements.filter(a => a.group === group),
    })).filter(section => section.items.length > 0);
  }, [snapshot]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const total = snapshot?.achievements.length ?? 0;
  const earned = snapshot?.earnedCount ?? 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
        }
      >
        <View style={styles.header}>
          <Pressable
            hitSlop={10}
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="chevron-right" size={18} color={palette.fg2} />
            </View>
            <Text style={styles.backLabel}>DASHBOARD</Text>
          </Pressable>
          <Eyebrow>YOUR BADGES</Eyebrow>
          <Text style={styles.headerTitle}>Achievements</Text>
          {snapshot && (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressCount}>
                  {earned} / {total} earned
                </Text>
              </View>
              <ProgressBar value={total ? earned / total : 0} />
            </>
          )}
        </View>

        {!snapshot ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.gold} />
          </View>
        ) : (
          groups.map(({ group, items }) => {
            const groupEarned = items.filter(a => a.earned).length;
            return (
              <View key={group}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{ACHIEVEMENT_GROUP_TITLES[group].toUpperCase()}</Text>
                  <Text style={styles.sectionCount}>
                    {groupEarned}/{items.length}
                  </Text>
                </View>
                <Card style={{ overflow: 'hidden' }}>
                  {items.map((achievement, i) => (
                    <AchievementRow key={achievement.id} achievement={achievement} first={i === 0} />
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: 20 },

  header: { paddingTop: 8, paddingBottom: 10 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  backLabel: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg2, letterSpacing: 1.2 },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: palette.fg,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  progressCount: { fontFamily: fontFamily.mono, fontSize: 11, color: palette.fg2, letterSpacing: 0.66 },

  loading: { paddingVertical: 48, alignItems: 'center' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 12,
  },
  sectionTitle: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg3, letterSpacing: 1.2 },
  sectionCount: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg4, letterSpacing: 0.6 },

  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16 },
  rowDivider: { borderTopWidth: 1, borderTopColor: palette.line2 },
  rowBody: { flex: 1, marginLeft: 14 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { fontFamily: fontFamily.ui, fontSize: 14, color: palette.fg, flexShrink: 1 },
  rowTitleLocked: { color: palette.fg2 },
  rowTier: { fontFamily: fontFamily.mono, fontSize: 9, color: palette.fg4, letterSpacing: 1 },
  rowDescription: { fontFamily: fontFamily.ui, fontSize: 12, color: palette.fg3, marginTop: 3, lineHeight: 17 },
  rowBar: { marginTop: 8 },
  rowStatus: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg4, marginTop: 6, letterSpacing: 0.4 },
  rowStatusEarned: { color: palette.gold },
});
