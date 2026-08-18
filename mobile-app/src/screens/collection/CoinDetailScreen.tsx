import React, { useState } from 'react';
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
import { COIN_CATEGORY_LABELS, formatMintMark, mintMarkLetter } from '@coin-collecting/shared';

import { palette, fontFamily, radius } from '../../theme';
import {
  Card,
  Eyebrow,
  Button,
  Icon,
  ImageLightbox,
} from '../../components/design';
import { Coin } from '../../types/coin';
import { CoinService } from '../../services/coinService';
import { CoinStoryService } from '../../services/coinStoryService';
import { Logger } from '../../services/logger';
import { CollectionStackParamList } from '../../types/navigation';
import { useCurrency } from '../../contexts/CurrencyContext';

type DetailRouteProp = RouteProp<CollectionStackParamList, 'CoinDetail'>;

interface Row {
  label: string;
  value: string | null | undefined;
}

export default function CoinDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<DetailRouteProp>();
  const coin: Coin = route.params.coin;
  const { format } = useCurrency();

  const formatCurrency = (n?: number | null): string | null =>
    n == null ? null : format(n);

  const [lightbox, setLightbox] = useState<{ uri: string; label: string } | null>(null);

  // "About this coin". Scans arrive with this already written; hand-typed coins
  // get it from the background backfill on save, and anything the backfill
  // missed (added before this existed, offline at the time, or a story the
  // model declined) can be requested here.
  const [story, setStory] = useState<string | null>(coin.historicalNotes ?? null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const canRequestStory = CoinStoryService.hasEnoughDetail(
    CoinStoryService.fromCoin(coin)
  );

  const onGetStory = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const text = await CoinStoryService.generateAndSave(coin);
      if (text) {
        setStory(text);
      } else {
        setStoryError(
          'There isn\'t enough recorded about this coin to write an accurate note. Try adding the country or mint mark.'
        );
      }
    } catch (err) {
      Logger.error('Coin story request failed', err);
      setStoryError(
        err instanceof Error ? err.message : 'Could not write a story right now.'
      );
    } finally {
      setStoryLoading(false);
    }
  };

  const titleLine = `${coin.year} ${coin.denomination}`;
  // Only a real stamped letter earns space in the compact line; "no mint mark"
  // and "unknown" are shown in full in the basics rows below.
  const mintLetter = mintMarkLetter(coin.mintMark);
  const subtitleLine = [coin.country, coin.grade, mintLetter && `Mint ${mintLetter}`]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase() || null;

  const basics: Row[] = [
    { label: 'YEAR', value: coin.year ? String(coin.year) : null },
    { label: 'DENOMINATION', value: coin.denomination },
    { label: 'COUNTRY', value: coin.country },
    { label: 'MINT MARK', value: formatMintMark(coin.mintMark) },
    { label: 'CATEGORY', value: coin.category ? COIN_CATEGORY_LABELS[coin.category] : null },
  ];

  const details: Row[] = [
    { label: 'GRADE', value: coin.grade },
    { label: 'SERIES', value: coin.series },
    { label: 'SPECIFIC COIN', value: coin.specificCoinName },
    { label: 'DESIGNER', value: coin.designer },
    { label: 'THEME', value: coin.theme },
    { label: 'HONOREE', value: coin.honoree },
    {
      label: 'RELEASE DATE',
      value: coin.releaseDate
        ? new Date(coin.releaseDate).toLocaleDateString()
        : null,
    },
    { label: 'CERT NUMBER', value: coin.certificationNumber },
    { label: 'GRADING SERVICE', value: coin.gradingService },
  ];

  const acquisition: Row[] = [
    { label: 'FACE VALUE', value: formatCurrency(coin.faceValue) },
    { label: 'PURCHASE PRICE', value: formatCurrency(coin.purchasePrice) },
    {
      label: 'PURCHASE DATE',
      value: coin.purchaseDate
        ? new Date(coin.purchaseDate).toLocaleDateString()
        : null,
    },
  ];

  const onEdit = () => {
    navigation.navigate('EditCoin', { coinId: coin.id });
  };

  const onDelete = () => {
    Alert.alert(
      'Delete coin',
      `Permanently remove ${titleLine}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CoinService.deleteCoin(coin.id);
              navigation.goBack();
            } catch (err) {
              Logger.error('Delete coin failed', err);
              Alert.alert('Could not delete', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        // The floating tab bar overlays the bottom of the screen; 24pt left the
        // Delete/Edit actions underneath it and unreachable. Matches the
        // clearance the other tab screens use.
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron-right" size={22} color={palette.fg} stroke={2} />
            </View>
          </Pressable>
          <Eyebrow>COIN</Eyebrow>
          <View style={{ width: 22 }} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{titleLine}</Text>
          {subtitleLine ? <Text style={styles.subtitle}>{subtitleLine}</Text> : null}
          {coin.name && coin.name !== titleLine ? (
            <Text style={styles.nameLine}>{coin.name}</Text>
          ) : null}
        </View>

        {/* Image gallery */}
        <View style={styles.imagePair}>
          {([
            { key: 'obv', uri: coin.obverseImage, label: 'OBV' },
            { key: 'rev', uri: coin.reverseImage, label: 'REV' },
          ] as const).map(({ key, uri, label }) => (
            <Pressable
              key={key}
              disabled={!uri}
              onPress={() => uri && setLightbox({ uri, label })}
              style={[
                styles.imageSlot,
                uri ? { borderStyle: 'solid' } : { borderStyle: 'dashed' },
              ]}
            >
              {uri ? (
                <>
                  <Image source={{ uri }} style={styles.imageFill} />
                  <View style={styles.imageBadge}>
                    <Text style={styles.imageBadgeText}>{label}</Text>
                  </View>
                  <View style={styles.zoomBadge}>
                    <Icon name="plus" size={11} color={palette.goldFg} stroke={2.6} />
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Icon name="info" size={14} color={palette.fg4} />
                  <Text style={styles.imageEmpty}>{label} NOT PROVIDED</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Section title="BASICS" rows={basics} />
        <Section title="DETAILS" rows={details} />
        <Section title="ACQUISITION" rows={acquisition} />

        {story || canRequestStory ? (
          <View style={styles.section}>
            <Eyebrow style={styles.sectionTitle}>ABOUT THIS COIN</Eyebrow>
            <Card style={{ padding: 14 }}>
              {story ? (
                <>
                  <Text style={styles.aboutText}>{story}</Text>
                  <Text style={styles.aboutSub}>
                    Written by AI from numismatic references — enjoy the story, verify the specifics.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.aboutPrompt}>
                    {storyLoading
                      ? 'Looking this coin up…'
                      : 'Every coin has a story — the designer, why the metal changed, what to look for. Ask for this one.'}
                  </Text>
                  {storyError ? (
                    <Text style={styles.aboutError}>{storyError}</Text>
                  ) : null}
                  <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                    <Button
                      label={
                        storyLoading
                          ? 'Writing…'
                          : storyError
                          ? 'Try again'
                          : 'Tell me about this coin'
                      }
                      variant="gold"
                      disabled={storyLoading}
                      onPress={onGetStory}
                      leading={
                        <Icon
                          name="info"
                          size={14}
                          color={palette.goldFg}
                          stroke={2.4}
                        />
                      }
                    />
                  </View>
                </>
              )}
            </Card>
          </View>
        ) : null}

        {coin.notes ? (
          <View style={styles.section}>
            <Eyebrow style={styles.sectionTitle}>NOTES</Eyebrow>
            <Card style={{ padding: 14 }}>
              <Text style={styles.notesText}>{coin.notes}</Text>
            </Card>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable onPress={onDelete} hitSlop={6} style={styles.deleteLink}>
            <Icon name="x" size={13} color={palette.cLow} stroke={2.4} />
            <Text style={styles.deleteText}>Delete coin</Text>
          </Pressable>
          <Button
            label="Edit details"
            variant="gold"
            onPress={onEdit}
            flex={1.5}
            leading={
              <Icon name="edit" size={14} color={palette.goldFg} stroke={2.4} />
            }
          />
        </View>
      </ScrollView>

      <ImageLightbox
        visible={!!lightbox}
        uri={lightbox?.uri ?? null}
        label={lightbox?.label}
        onClose={() => setLightbox(null)}
      />
    </View>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const populated = rows.filter((r) => r.value && String(r.value).trim() !== '');
  if (populated.length === 0) return null;
  return (
    <View style={styles.section}>
      <Eyebrow style={styles.sectionTitle}>{title}</Eyebrow>
      <Card style={{ overflow: 'hidden' }}>
        {populated.map((r, i) => (
          <View
            key={r.label}
            style={[
              styles.row,
              i > 0 && { borderTopWidth: 1, borderTopColor: palette.line },
            ]}
          >
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowValue} numberOfLines={2}>
              {r.value}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },

  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: palette.fg,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  nameLine: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg2,
    marginTop: 6,
  },

  imagePair: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    gap: 10,
  },
  imageSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageFill: { width: '100%', height: '100%' },
  imageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    color: palette.gold,
    letterSpacing: 1.4,
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmpty: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg4,
    letterSpacing: 1.2,
  },

  section: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  sectionTitle: { marginLeft: 4 },

  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    color: palette.fg3,
  },
  rowValue: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg,
    flexShrink: 1,
    textAlign: 'right',
  },

  notesText: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg2,
    lineHeight: 20,
  },

  aboutText: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg,
    lineHeight: 21,
  },
  aboutSub: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg4,
    letterSpacing: 0.4,
    marginTop: 10,
  },
  aboutPrompt: {
    fontFamily: fontFamily.ui,
    fontSize: 13.5,
    color: palette.fg3,
    lineHeight: 20,
  },
  aboutError: {
    fontFamily: fontFamily.ui,
    fontSize: 12.5,
    color: palette.cLow,
    lineHeight: 18,
    marginTop: 8,
  },

  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  deleteText: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.cLow,
  },
});
