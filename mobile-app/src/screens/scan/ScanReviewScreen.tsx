import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, StackActions } from '@react-navigation/native';
import {
  COIN_CATEGORY_LABELS,
  formatMintMark,
  scanFilledAlbumTitle,
  scanReviewFields,
  scanReviewHeader,
} from '@coin-collecting/shared';

import { fontFamily, radius, makeStyles, useTheme, darkPalette } from '../../theme';
import { Card, ConfBadge, Icon, Eyebrow, Button } from '../../components/design';
import { ScanStackParamList } from '../../types/navigation';
import { CoinService } from '../../services/coinService';
import { Logger } from '../../services/logger';
import { ScanCheckCard } from './components/ScanCheckCard';

// The header lines and field list come from packages/shared
// (utils/scanPipeline.ts), so the web review screen reads the same. Only the
// grade row carries a confidence badge: the recognizer scores the grade on its
// own, and gives one overall confidence for everything else (in the header).

export default function ScanReviewScreen() {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanReview'>>();
  const { result } = route.params;
  const { obverseUri, reverseUri } = result;
  // A correction from "Check these" replaces both, so every line below shows
  // what's saved.
  const [recognition, setRecognition] = useState(result.recognition);
  const [coin, setCoin] = useState(result.coin);
  const [checked, setChecked] = useState(false);

  const header = useMemo(() => scanReviewHeader(recognition, coin.name), [recognition, coin.name]);
  const titleLine = header.title;
  const subtitleLine = header.subtitle;
  const eyebrowText = header.eyebrow;
  const eyebrowColor =
    header.level === 'h' ? palette.cHigh : header.level === 'm' ? palette.cMed : palette.cLow;

  // If the scan pipeline pre-tagged this coin to an album slot, name the album.
  const filledAlbumTitle = useMemo(
    () => scanFilledAlbumTitle(coin),
    [coin.specificCoinId, coin.seriesId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fields = useMemo(
    () => scanReviewFields(recognition, formatMintMark, category => COIN_CATEGORY_LABELS[category]),
    [recognition]
  );

  // `initial: false` puts CollectionList underneath the pushed screen. Without
  // it the Collection stack is created containing ONLY this screen, so Cancel
  // has nothing to pop to — it falls through to the tab navigator (looking like
  // "went home") and leaves the Collection tab stuck on the edit form.
  // Leaving this screen for another tab does not unmount the scan stack, so
  // whatever sits on top here is what the collector meets next time they open
  // Scan. Both exits below are terminal for this scan — the coin is already
  // saved — so wind the stack back to the camera on the way out.
  const leaveScanStack = () => {
    navigation.dispatch(StackActions.popToTop());
  };

  const onEdit = () => {
    leaveScanStack();
    navigation.getParent()?.navigate('Collection', {
      screen: 'EditCoin',
      params: { coinId: coin.id },
      initial: false,
    });
  };

  const onDone = () => {
    leaveScanStack();
    navigation.getParent()?.navigate('Collection', { screen: 'CollectionList' });
  };

  const onDiscard = () => {
    Alert.alert(
      'Discard this scan?',
      `${coin.name || 'This coin'} and its photos will be removed from your collection.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              await CoinService.deleteCoin(coin.id);
            } catch (err) {
              Logger.error('Failed to discard scanned coin', err);
            }
            navigation.navigate('ScanCapture');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Eyebrow color={eyebrowColor}>{eyebrowText}</Eyebrow>
            <Pressable
              hitSlop={10}
              onPress={onDiscard}
              accessibilityRole="button"
              accessibilityLabel="Discard this scan"
            >
              <Text style={styles.discardText}>DISCARD</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{titleLine}</Text>
          {subtitleLine && <Text style={styles.subtitle}>{subtitleLine}</Text>}
        </View>

        {/* Coin pair — real captured images */}
        <View style={styles.coinPair}>
          {([
            { side: 'OBV', uri: obverseUri },
            { side: 'REV', uri: reverseUri },
          ] as const).map(({ side, uri }) => (
            <View key={side} style={styles.coinSlot}>
              <Image source={{ uri }} style={styles.coinImage} />
              <Text style={styles.coinSlotLabel}>{side}</Text>
            </View>
          ))}
        </View>

        {/* Check the two fields that decide the album slot */}
        {!checked && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
            <ScanCheckCard
              recognition={recognition}
              coin={coin}
              onConfirmed={() => setChecked(true)}
              onCorrected={(fixed, read) => {
                setCoin(fixed);
                setRecognition(read);
                setChecked(true);
              }}
            />
          </View>
        )}

        {/* Album slot fill — the scan magic moment */}
        {filledAlbumTitle && (
          <View style={styles.albumFillRow}>
            <Icon name="album" size={14} color={palette.goldText} />
            <Text style={styles.albumFillText}>
              Fills a slot in {filledAlbumTitle}
            </Text>
          </View>
        )}

        {/* The HIGH/MED/LOW legend that stood here explained a badge on every
            row. Only the grade carries one now, and it prints its own score,
            so three chips of scale for one badge was more noise than key. */}
        {/* Field list */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <Card style={{ overflow: 'hidden' }}>
            {fields.map((f, i) => (
              <View
                key={f.label}
                style={[
                  styles.field,
                  i > 0 && { borderTopWidth: 1, borderTopColor: palette.line },
                ]}
              >
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  {f.placeholder ? (
                    <ConfBadge level="n" label="UNRECOGNIZED" />
                  ) : f.level ? (
                    <ConfBadge
                      level={f.level}
                      label={f.level === 'h' ? 'HIGH' : f.level === 'm' ? 'MED' : 'LOW'}
                      score={Math.round((f.score ?? 0) * 100)}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.fieldValue,
                    f.placeholder && { color: palette.fg3 },
                  ]}
                >
                  {f.value}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* About this coin — the story behind what was just scanned */}
        {recognition.history && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
            <Eyebrow style={{ marginBottom: 8 }}>ABOUT THIS COIN</Eyebrow>
            <Card style={{ padding: 14 }}>
              <Text style={styles.historyText}>{recognition.history}</Text>
              <Text style={styles.historySub}>
                Written by AI from numismatic references — enjoy the story, verify the specifics.
              </Text>
            </Card>
          </View>
        )}

        {recognition.notes && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
            <Eyebrow style={{ marginBottom: 8 }}>CONDITION NOTES</Eyebrow>
            <Card style={{ padding: 14 }}>
              <Text style={styles.notesText}>{recognition.notes}</Text>
            </Card>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button label="Edit details" variant="ghost" onPress={onEdit} flex={1} />
          <Button
            label="Done"
            variant="gold"
            onPress={onDone}
            flex={1.4}
            leading={<Icon name="check" size={15} color={palette.goldFg} stroke={2.4} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discardText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    color: palette.fg3,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: palette.fg,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
    marginTop: 8,
    letterSpacing: 0.5,
  },

  coinPair: { paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', gap: 10 },
  coinSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.base,
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coinImage: { width: '100%', height: '100%' },
  coinSlotLabel: {
    position: 'absolute',
    top: 10, left: 10,
    fontFamily: fontFamily.mono,
    fontSize: 9,
    // Sits on a photo, so it stays dark in both themes.
    color: darkPalette.gold,
    letterSpacing: 1.4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  albumFillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.goldDim,
    backgroundColor: palette.chipActiveBg,
  },
  albumFillText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.goldText,
    letterSpacing: 0.66,
  },

  field: { padding: 12, paddingHorizontal: 16, gap: 4 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
    color: palette.fg3,
  },
  fieldValue: { fontFamily: fontFamily.ui, fontSize: 15, color: palette.fg },

  notesText: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.fg2,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  historyText: {
    fontFamily: fontFamily.ui,
    fontSize: 13.5,
    color: palette.fg,
    lineHeight: 21,
  },
  historySub: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg4,
    letterSpacing: 0.4,
    marginTop: 10,
  },

  actions: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', gap: 10 },
}));
