import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { palette, fontFamily, radius } from '../../theme';
import { CoinDisc, Icon, Eyebrow, Button } from '../../components/design';
import { ScanStackParamList } from '../../types/navigation';
import {
  runScan,
  StageId,
  StageState,
  StageUpdate,
  PipelineError,
} from '../../services/scanPipeline';

interface StageDef {
  title: string;
  detail: string;
}

const STAGE_DEFS: StageDef[] = [
  { title: 'Identifying coin', detail: 'Vision · Claude Haiku' },
  { title: 'Estimating grade', detail: 'Sheldon scale · wear, luster, strike' },
  { title: 'Gathering the story', detail: 'History · design · collecting notes' },
  { title: 'Cataloging entry', detail: 'Saving to your collection' },
];

interface StageView {
  state: StageState;
  resultText?: string;
}

export default function ScanPipelineScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanPipeline'>>();
  const { obverseUri, reverseUri } = route.params;

  const [stages, setStages] = useState<StageView[]>([
    { state: 'pending' },
    { state: 'pending' },
    { state: 'pending' },
    { state: 'pending' },
  ]);
  const [error, setError] = useState<PipelineError | null>(null);
  const [done, setDone] = useState(false);

  const spin = useRef(new Animated.Value(0)).current;
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setError(null);
    setDone(false);
    setStages([
      { state: 'pending' },
      { state: 'pending' },
      { state: 'pending' },
      { state: 'pending' },
    ]);

    const onProgress = (u: StageUpdate) => {
      if (cancelled.current) return;
      setStages((prev) => {
        const next = [...prev];
        next[u.stage - 1] = {
          state: u.state,
          resultText: u.resultText ?? next[u.stage - 1].resultText,
        };
        return next;
      });
    };

    runScan({ obverseUri, reverseUri, onProgress })
      .then((result) => {
        if (cancelled.current) return;
        setDone(true);
        const t = setTimeout(() => {
          if (!cancelled.current) navigation.replace('ScanReview', { result });
        }, 600);
        return () => clearTimeout(t);
      })
      .catch((err) => {
        if (cancelled.current) return;
        if (err instanceof PipelineError) setError(err);
        else setError(new PipelineError('unknown', 1, err?.message ?? 'Scan failed.'));
      });

    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obverseUri, reverseUri]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const activeStageIdx = stages.findIndex((s) => s.state === 'active');
  const allDone = stages.every((s) => s.state === 'done' || s.state === 'warn');
  const title = error
    ? 'Scan paused.'
    : done || allDone
    ? 'Done. Review below.'
    : 'One moment…';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.header}>
          <Eyebrow>{error ? 'SCAN ERROR' : 'SCANNING'}</Eyebrow>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Spinning coin */}
        <View style={styles.coinWrap}>
          <View style={styles.coinPositioner}>
            <Animated.View
              style={[
                styles.coinSpinRing,
                { transform: activeStageIdx >= 0 ? [{ rotate }] : [] },
              ]}
            />
            <CoinDisc size={140} label="OBV" tone="copper" imageSource={{ uri: obverseUri }} />
            {(allDone || done) && !error && (
              <View style={styles.checkBadge}>
                <Icon name="check" size={18} color={palette.goldFg} stroke={2.4} />
              </View>
            )}
          </View>
        </View>

        {/* Stage list */}
        <View style={styles.stageList}>
          {STAGE_DEFS.map((s, i) => {
            const stage = stages[i];
            return (
              <View key={i}>
                <View style={styles.stage}>
                  <StageBullet state={stage.state} />
                  <View style={styles.stageBody}>
                    <Text
                      style={[
                        styles.stageTitle,
                        stage.state === 'pending' && { color: palette.fg4 },
                      ]}
                    >
                      {s.title}
                    </Text>
                    <Text
                      style={[
                        styles.stageDetail,
                        stage.state === 'warn' && { color: palette.cMed },
                        stage.state === 'error' && { color: palette.cLow },
                      ]}
                    >
                      {stage.state === 'done' || stage.state === 'warn' || stage.state === 'error'
                        ? stage.resultText ?? s.detail
                        : s.detail}
                    </Text>
                  </View>
                  {stage.state === 'active' && <ActiveSpinner />}
                </View>
                {i < STAGE_DEFS.length - 1 && (
                  <View
                    style={[
                      styles.stageConnector,
                      stage.state === 'done' && { backgroundColor: palette.gold },
                      stage.state === 'warn' && { backgroundColor: palette.cMed },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorBlock}>
            <View style={styles.errorCard}>
              <Icon
                name={error.type === 'unrecognized' || error.type === 'quota' ? 'info' : 'warning'}
                size={16}
                color={palette.cLow}
              />
              <Text style={styles.errorMessage}>{error.message}</Text>
            </View>
            <View style={styles.errorActions}>
              {error.type === 'unrecognized' || error.type === 'quota' ? (
                <>
                  <Button
                    label="Add manually"
                    variant="gold"
                    onPress={() =>
                      navigation.getParent()?.navigate('Collection', {
                        screen: 'AddCoin',
                        params: { initialImages: { obverseUri, reverseUri } },
                        // Keep CollectionList underneath so Cancel can pop back
                        // to it instead of stranding the tab on the form.
                        initial: false,
                      })
                    }
                    flex={1.2}
                  />
                  <Button
                    label="Retake"
                    variant="ghost"
                    onPress={() => navigation.popToTop()}
                    flex={1}
                  />
                </>
              ) : error.type === 'rate_limit' ? (
                <Button
                  label="Back"
                  variant="ghost"
                  onPress={() => navigation.popToTop()}
                  flex={1}
                />
              ) : (
                <>
                  <Button
                    label="Try again"
                    variant="gold"
                    onPress={() =>
                      navigation.replace('ScanPipeline', { obverseUri, reverseUri })
                    }
                    flex={1}
                  />
                  <Button
                    label="Back"
                    variant="ghost"
                    onPress={() => navigation.popToTop()}
                    flex={1}
                  />
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StageBullet({ state }: { state: StageState }) {
  const isDone = state === 'done';
  const isWarn = state === 'warn';
  const isError = state === 'error';
  const isActive = state === 'active';
  return (
    <View
      style={[
        styles.bullet,
        isDone && { backgroundColor: palette.gold, borderColor: palette.gold },
        isWarn && { backgroundColor: palette.cMed, borderColor: palette.cMed },
        isError && { backgroundColor: palette.cLow, borderColor: palette.cLow },
        isActive && { borderColor: palette.gold },
      ]}
    >
      {(isDone || isWarn) && (
        <Icon name="check" size={12} color={palette.goldFg} stroke={2.6} />
      )}
      {isError && <Icon name="x" size={12} color={palette.goldFg} stroke={2.6} />}
      {isActive && <View style={[styles.bulletInnerDot, { backgroundColor: palette.gold }]} />}
      {state === 'pending' && (
        <View
          style={[
            styles.bulletInnerDot,
            { backgroundColor: palette.fg4, width: 4, height: 4, borderRadius: 2 },
          ]}
        />
      )}
    </View>
  );
}

function ActiveSpinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.activeSpinner, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: palette.fg,
    letterSpacing: -0.5,
    marginTop: 6,
  },

  coinWrap: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  coinPositioner: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  coinSpinRing: {
    position: 'absolute',
    width: 152, height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -8, right: -8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },

  stageList: { paddingHorizontal: 20, paddingBottom: 24 },
  stage: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  bullet: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, borderColor: palette.line,
    backgroundColor: palette.bg2,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  bulletInnerDot: { width: 6, height: 6, borderRadius: 3 },
  stageBody: { flex: 1 },
  stageTitle: { fontFamily: fontFamily.ui, fontSize: 14, color: palette.fg },
  stageDetail: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: palette.fg4,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  activeSpinner: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: palette.gold,
    borderTopColor: 'transparent',
    marginTop: 4,
  },
  stageConnector: {
    width: 1, height: 18,
    backgroundColor: palette.line,
    marginLeft: 11,
  },

  errorBlock: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: palette.cLow,
    backgroundColor: palette.bg2,
  },
  errorMessage: {
    flex: 1,
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.fg,
    lineHeight: 18,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
