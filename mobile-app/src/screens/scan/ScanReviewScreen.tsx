import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { buildAlbums, canonicalizeMintMark, formatMintMark } from '@coin-collecting/shared';

import { palette, fontFamily, radius } from '../../theme';
import {
  Card,
  ConfBadge,
  ConfLevel,
  Icon,
  Eyebrow,
  Button,
} from '../../components/design';
import { ScanStackParamList } from '../../types/navigation';
import { RecognitionConfidence } from '../../types/recognition';
import { CoinService } from '../../services/coinService';
import { Logger } from '../../services/logger';

function formatFaceValue(value: number, currency: string | null): string {
  if (currency) {
    try {
      return value.toLocaleString('en-US', { style: 'currency', currency });
    } catch {
      // Unknown/invalid ISO code — fall through to plain formatting
    }
  }
  return currency ? `${value} ${currency}` : String(value);
}

interface FieldDef {
  label: string;
  value: string;
  level: ConfLevel;
  score: number;
  sub?: string;
  placeholder?: boolean;
}

function confToLevel(c: RecognitionConfidence | 'high' | 'medium' | 'low' | undefined): ConfLevel {
  switch (c) {
    case 'high':
      return 'h';
    case 'medium':
      return 'm';
    case 'low':
      return 'l';
    default:
      return 'n';
  }
}

function confToScore(c: RecognitionConfidence | 'high' | 'medium' | 'low' | undefined): number {
  switch (c) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.7;
    case 'low':
      return 0.4;
    default:
      return 0;
  }
}

function buildField(
  label: string,
  raw: string | number | null | undefined,
  conf: RecognitionConfidence | 'high' | 'medium' | 'low' | undefined,
  sub?: string
): FieldDef {
  const has = raw !== null && raw !== undefined && String(raw).trim() !== '';
  return {
    label,
    value: has ? String(raw) : '—',
    level: has ? confToLevel(conf) : 'n',
    score: has ? confToScore(conf) : 0,
    sub: has ? sub : undefined,
    placeholder: !has,
  };
}

export default function ScanReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ScanStackParamList, 'ScanReview'>>();
  const { result } = route.params;
  const { recognition, coin, obverseUri, reverseUri } = result;

  const titleLine = useMemo(() => {
    const parts = [recognition.country, recognition.denomination].filter(Boolean);
    return parts.join(' · ') || coin.name || 'Untitled coin';
  }, [recognition, coin]);

  const subtitleLine = useMemo(() => {
    const parts = [
      recognition.year ? String(recognition.year) : null,
      recognition.composition,
      recognition.grade,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ').toUpperCase() : null;
  }, [recognition]);

  const eyebrowText = useMemo(() => {
    const pct = Math.round(confToScore(recognition.confidence) * 100);
    const prefix =
      recognition.confidence === 'high'
        ? '✓ IDENTIFIED'
        : recognition.confidence === 'medium'
        ? '~ IDENTIFIED'
        : 'TENTATIVE';
    return `${prefix} · ${pct}%`;
  }, [recognition]);

  const eyebrowColor =
    recognition.confidence === 'high'
      ? palette.cHigh
      : recognition.confidence === 'medium'
      ? palette.cMed
      : palette.cLow;

  // If the scan pipeline pre-tagged this coin to an album slot, name the album.
  const filledAlbumTitle = useMemo(() => {
    if (!coin.specificCoinId || !coin.seriesId) return null;
    return buildAlbums().find(album => album.seriesId === coin.seriesId)?.title ?? null;
  }, [coin.specificCoinId, coin.seriesId]);

  const fields: FieldDef[] = useMemo(() => {
    const base: FieldDef[] = [
      buildField('COUNTRY', recognition.country, recognition.confidence),
      buildField('YEAR', recognition.year, recognition.confidence),
      buildField('DENOMINATION', recognition.denomination, recognition.confidence),
      buildField(
        'MINT MARK',
        formatMintMark(canonicalizeMintMark(recognition.mintMark)),
        recognition.confidence
      ),
      buildField('COMPOSITION', recognition.composition, recognition.confidence),
      buildField('ESTIMATED GRADE', recognition.grade, recognition.gradeConfidence),
      buildField(
        'FACE VALUE',
        recognition.faceValue != null
          ? formatFaceValue(recognition.faceValue, recognition.currency)
          : null,
        recognition.confidence
      ),
    ];

    return base;
  }, [recognition]);

  // `initial: false` puts CollectionList underneath the pushed screen. Without
  // it the Collection stack is created containing ONLY this screen, so Cancel
  // has nothing to pop to — it falls through to the tab navigator (looking like
  // "went home") and leaves the Collection tab stuck on the edit form.
  const onEdit = () => {
    navigation.getParent()?.navigate('Collection', {
      screen: 'EditCoin',
      params: { coinId: coin.id },
      initial: false,
    });
  };

  const onDone = () => {
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

        {/* Album slot fill — the scan magic moment */}
        {filledAlbumTitle && (
          <View style={styles.albumFillRow}>
            <Icon name="album" size={14} color={palette.gold} />
            <Text style={styles.albumFillText}>
              Fills a slot in {filledAlbumTitle}
            </Text>
          </View>
        )}

        {/* Confidence legend */}
        <View style={styles.legend}>
          <ConfBadge level="h" label="HIGH ≥85" />
          <ConfBadge level="m" label="MED 60–85" />
          <ConfBadge level="l" label="LOW 30–60" />
        </View>

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
                  ) : (
                    <ConfBadge
                      level={f.level}
                      label={f.level === 'h' ? 'HIGH' : f.level === 'm' ? 'MED' : 'LOW'}
                      score={Math.round(f.score * 100)}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.fieldValue,
                    f.placeholder && { color: palette.fg3 },
                  ]}
                >
                  {f.value}
                </Text>
                {f.sub ? <Text style={styles.fieldSub}>{f.sub}</Text> : null}
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

const styles = StyleSheet.create({
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
    color: palette.gold,
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
    color: palette.gold,
    letterSpacing: 0.66,
  },

  legend: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  fieldSub: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.fg4, marginTop: 3 },

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
});
