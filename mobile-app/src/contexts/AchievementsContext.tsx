import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { AchievementDefinition } from '@coin-collecting/shared';

import { AchievementService, AchievementSnapshot } from '../services/achievementService';
import { CoinService } from '../services/coinService';
import { Logger } from '../services/logger';
import { useAuth } from '../hooks/useAuth';
import { AchievementBadge, TIER_LABEL } from '../components/achievements/AchievementBadge';
import { Button, Eyebrow } from '../components/design';
import { palette, fontFamily, radius } from '../theme';

// Runs the achievements check whenever a coin is saved or edited, keeps the
// latest result for the Dashboard card and the Achievements screen, and shows
// a celebration for each badge a check unlocks.

interface AchievementsContextValue {
  /** Null until the first check finishes. */
  snapshot: AchievementSnapshot | null;
  refresh: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

/** Long enough that a save followed by an edit runs one check, not two. */
const CHECK_DELAY_MS = 800;

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<AchievementSnapshot | null>(null);
  const [queue, setQueue] = useState<AchievementDefinition[]>([]);
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    try {
      const coins = await CoinService.getUserCoins();
      const result = await AchievementService.check(coins, current);
      // Signed out (or into another account) while the check ran.
      if (userRef.current?.id !== current.id) return;
      setSnapshot(result);
      if (result.newlyUnlocked.length > 0) {
        setQueue(previous => [...previous, ...result.newlyUnlocked]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      Logger.warn('Achievements check failed', err);
    }
  }, []);

  useEffect(() => {
    setSnapshot(null);
    setQueue([]);
    if (user) refresh();
  }, [user?.id, refresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = CoinService.onCoinsChanged(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
      }, CHECK_DELAY_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  const showing = queue[0];
  const dismiss = useCallback(() => setQueue(previous => previous.slice(1)), []);

  return (
    <AchievementsContext.Provider value={{ snapshot, refresh }}>
      {children}
      <Modal visible={Boolean(showing)} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.backdrop}>
          {showing && (
            <View style={styles.card} accessibilityViewIsModal>
              <Eyebrow>ACHIEVEMENT UNLOCKED</Eyebrow>
              <View style={styles.badge}>
                <AchievementBadge achievement={showing} earned size={104} />
              </View>
              <Text style={styles.title} accessibilityRole="header">
                {showing.title}
              </Text>
              <Text style={styles.description}>{showing.description}</Text>
              <Text style={styles.tier}>{TIER_LABEL[showing.tier].toUpperCase()}</Text>
              <View style={styles.actions}>
                <Button
                  label={queue.length > 1 ? `Next · ${queue.length - 1} more` : 'Nice!'}
                  variant="gold"
                  onPress={dismiss}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const value = useContext(AchievementsContext);
  if (!value) throw new Error('useAchievements must be used inside AchievementsProvider');
  return value;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.goldRing,
    borderRadius: radius.base,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  badge: { marginTop: 20, marginBottom: 18 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: palette.fg,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  description: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg2,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  tier: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.gold,
    letterSpacing: 1.4,
    marginTop: 12,
  },
  actions: { alignSelf: 'stretch', marginTop: 24 },
});
