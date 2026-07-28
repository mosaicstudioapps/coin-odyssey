import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getAlbumById, AlbumSlot, AlbumSection } from '@coin-collecting/shared';

import { palette, fontFamily, radius } from '../../theme';
import { Eyebrow, Icon, Button, ProgressBar } from '../../components/design';
import { CoinService } from '../../services/coinService';
import { Logger } from '../../services/logger';
import {
  computeAlbumFills,
  buildSlotAssignment,
  buildSlotRemoval,
  SlotFill,
} from '../../services/albumService';
import type { Coin } from '../../types/coin';
import type { AlbumsStackScreenProps } from '../../types/navigation';
import { AlbumSlotCell } from './components/AlbumSlotCell';
import { SlotAssignSheet } from './components/SlotAssignSheet';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

const SLOTS_PER_ROW = 4;

/** SectionList rows are pre-chunked groups of 4 slots (perf on 140-slot albums). */
interface SlotSection {
  id: string;
  title: string;
  slotCount: number;
  data: AlbumSlot[][];
}

function chunkSlots(section: AlbumSection): AlbumSlot[][] {
  const rows: AlbumSlot[][] = [];
  for (let i = 0; i < section.slots.length; i += SLOTS_PER_ROW) {
    rows.push(section.slots.slice(i, i + SLOTS_PER_ROW));
  }
  return rows;
}

export default function AlbumDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<AlbumsStackScreenProps<'AlbumDetail'>['route']>();
  const album = useMemo(() => getAlbumById(route.params.albumId), [route.params.albumId]);

  const [coins, setCoins] = useState<Coin[]>([]);
  const [load, setLoad] = useState<LoadState>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [assignSlot, setAssignSlot] = useState<AlbumSlot | null>(null);
  const [manageTarget, setManageTarget] = useState<{ slot: AlbumSlot; fill: SlotFill } | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await CoinService.getUserCoins();
      setCoins(data);
      setLoad('ready');
    } catch (err) {
      Logger.error('Failed to load coins for album detail', err);
      setLoad('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoad(prev => (prev === 'idle' ? 'loading' : prev));
      reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const fills = useMemo(
    () => (album ? computeAlbumFills(album, coins) : new Map<string, SlotFill>()),
    [album, coins]
  );

  const sections = useMemo<SlotSection[]>(() => {
    if (!album) return [];
    return album.sections.map(section => ({
      id: section.id,
      title: section.title,
      slotCount: section.slots.length,
      data: chunkSlots(section),
    }));
  }, [album]);

  const sectionFilled = useCallback(
    (section: SlotSection) =>
      section.data.reduce(
        (acc, row) => acc + row.filter(slot => fills.has(slot.id)).length,
        0
      ),
    [fills]
  );

  /** Optimistically patch a coin locally, run the write, revert + reload on failure. */
  const writeCoin = useCallback(
    async (coinId: string, updates: Partial<Coin>, failureMessage: string) => {
      const previous = coins;
      setCoins(prev => prev.map(c => (c.id === coinId ? { ...c, ...updates } : c)));
      try {
        await CoinService.updateCoin(coinId, updates as any);
      } catch (err) {
        Logger.error('Album slot write failed', err);
        setCoins(previous);
        Alert.alert('Something went wrong', failureMessage);
      }
    },
    [coins]
  );

  const handleAssign = useCallback(
    (coin: Coin) => {
      if (!album || !assignSlot) return;
      const assignment = buildSlotAssignment(album, assignSlot);
      setAssignSlot(null);
      if (!assignment) return;
      writeCoin(coin.id, assignment, 'Could not assign the coin to this slot. Please try again.');
    },
    [album, assignSlot, writeCoin]
  );

  const handleRemove = useCallback(() => {
    if (!manageTarget) return;
    const { fill, slot } = manageTarget;
    setManageTarget(null);
    Alert.alert(
      'Not this coin?',
      `Remove "${fill.coin.specificCoinName || fill.coin.name}" from the ${slot.label} slot? The coin stays in your collection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            writeCoin(
              fill.coin.id,
              buildSlotRemoval(),
              'Could not remove the coin from this slot. Please try again.'
            ),
        },
      ]
    );
  }, [manageTarget, writeCoin]);

  const viewCoin = useCallback(
    (coin: Coin) => {
      setManageTarget(null);
      navigation.getParent()?.navigate('Collection', {
        screen: 'CoinDetail',
        params: { coin },
      });
    },
    [navigation]
  );

  const handleSlotPress = useCallback(
    (slot: AlbumSlot, fill?: SlotFill) => {
      if (!album) return;
      if (album.kind === 'world') {
        // World album is read-only: tapping a filled country opens its coin.
        if (fill) viewCoin(fill.coin);
        return;
      }
      if (fill) {
        setManageTarget({ slot, fill });
      } else {
        setAssignSlot(slot);
      }
    },
    [album, viewCoin]
  );

  const renderRow = useCallback(
    ({ item }: { item: AlbumSlot[] }) => (
      <View style={styles.slotRow}>
        {item.map(slot => (
          <AlbumSlotCell
            key={slot.id}
            slot={slot}
            fill={fills.get(slot.id)}
            tone={album?.discTone ?? 'gold'}
            onPress={handleSlotPress}
          />
        ))}
        {Array.from({ length: SLOTS_PER_ROW - item.length }).map((_, i) => (
          <View key={`pad-${i}`} style={{ flex: 1 }} />
        ))}
      </View>
    ),
    [fills, album, handleSlotPress]
  );

  if (!album) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.fullState}>
          <Text style={styles.stateTitle}>Album not found</Text>
          <View style={{ height: 12 }} />
          <Button label="Back to albums" variant="gold" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const filled = fills.size;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(row, index) => row[0]?.id ?? `row-${index}`}
        renderItem={renderRow}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <Text style={styles.sectionCount}>
              {sectionFilled(section as SlotSection)}/{(section as SlotSection).slotCount}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={styles.backBtn}>
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="chevron-right" size={18} color={palette.fg2} />
              </View>
              <Text style={styles.backLabel}>ALBUMS</Text>
            </Pressable>
            <Eyebrow>{album.subtitle.toUpperCase()}</Eyebrow>
            <Text style={styles.headerTitle}>{album.title}</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressCount}>
                {filled} / {album.totalSlots} collected
              </Text>
            </View>
            <ProgressBar value={album.totalSlots > 0 ? filled / album.totalSlots : 0} />
            {load === 'error' && (
              <View style={styles.errorBanner}>
                <Icon name="warning" size={14} color={palette.cLow} />
                <Text style={styles.errorText}>Could not load your coins.</Text>
                <Pressable onPress={reload}>
                  <Text style={styles.errorRetry}>RETRY</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
      />

      <SlotAssignSheet
        visible={assignSlot != null}
        album={album}
        slot={assignSlot}
        coins={coins}
        onPick={handleAssign}
        onClose={() => setAssignSlot(null)}
      />

      {/* Manage sheet for a filled slot */}
      <Modal
        visible={manageTarget != null}
        animationType="fade"
        transparent
        onRequestClose={() => setManageTarget(null)}
      >
        <View style={styles.manageBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setManageTarget(null)} />
          <View style={[styles.manageSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.manageTitle} numberOfLines={1}>
              {manageTarget?.slot.label}
            </Text>
            <Text style={styles.manageSub} numberOfLines={1}>
              {manageTarget?.fill.coin.specificCoinName || manageTarget?.fill.coin.name}
              {manageTarget?.fill.source === 'heuristic' ? '  ·  AUTO-MATCHED' : ''}
            </Text>
            <View style={styles.manageActions}>
              <Button
                label="View coin"
                variant="gold"
                onPress={() => manageTarget && viewCoin(manageTarget.fill.coin)}
              />
              <Button
                label="Choose a different coin"
                variant="ghost"
                onPress={() => {
                  if (!manageTarget) return;
                  setAssignSlot(manageTarget.slot);
                  setManageTarget(null);
                }}
              />
              <Button label="Not this coin" variant="ghost" onPress={handleRemove} />
            </View>
          </View>
        </View>
      </Modal>
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
  backLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg2,
    letterSpacing: 1.2,
  },
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
  progressCount: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg2,
    letterSpacing: 0.66,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.warnBorder,
    backgroundColor: palette.warnBg,
  },
  errorText: { flex: 1, fontFamily: fontFamily.ui, fontSize: 12, color: palette.fg2 },
  errorRetry: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.gold,
    letterSpacing: 1.2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg3,
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg4,
    letterSpacing: 0.6,
  },

  slotRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  fullState: { paddingVertical: 56, paddingHorizontal: 16, alignItems: 'center', gap: 6 },
  stateTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: palette.fg,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 12,
  },

  manageBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  manageSheet: {
    backgroundColor: palette.bg2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  manageTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: palette.fg,
    letterSpacing: -0.4,
  },
  manageSub: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg3,
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 16,
  },
  manageActions: { gap: 10 },
});
