import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Album, AlbumSlot } from '@coin-collecting/shared';

import { palette, fontFamily, radius } from '../../../theme';
import { CoinDisc, Eyebrow, Icon } from '../../../components/design';
import { findCandidateCoins } from '../../../services/albumService';
import type { Coin } from '../../../types/coin';

interface Props {
  visible: boolean;
  album: Album;
  slot: AlbumSlot | null;
  coins: Coin[];
  onPick: (coin: Coin) => void;
  onClose: () => void;
}

type Row = { kind: 'header'; title: string } | { kind: 'coin'; coin: Coin };

function coinSub(coin: Coin): string {
  const parts = [String(coin.year || '—')];
  if (coin.mintMark) parts.push(coin.mintMark.toUpperCase());
  if (coin.country) parts.push(coin.country.toUpperCase());
  return parts.join(' · ');
}

export const SlotAssignSheet: React.FC<Props> = ({
  visible,
  album,
  slot,
  coins,
  onPick,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const rows = useMemo<Row[]>(() => {
    if (!slot) return [];
    const { likely, other } = findCandidateCoins(album, slot, coins);
    const result: Row[] = [];
    if (likely.length > 0) {
      result.push({ kind: 'header', title: 'LIKELY MATCHES' });
      result.push(...likely.map(coin => ({ kind: 'coin' as const, coin })));
    }
    if (other.length > 0) {
      result.push({ kind: 'header', title: likely.length > 0 ? 'ALL COINS' : 'YOUR COINS' });
      result.push(...other.map(coin => ({ kind: 'coin' as const, coin })));
    }
    return result;
  }, [album, slot, coins]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Eyebrow>FILL SLOT</Eyebrow>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {slot?.label ?? ''}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose}>
              <Icon name="x" size={18} color={palette.fg3} />
            </Pressable>
          </View>

          {rows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No coins in your collection yet. Add or scan a coin first, then assign it here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(row, index) => (row.kind === 'coin' ? row.coin.id : `header-${index}`)}
              renderItem={({ item }) =>
                item.kind === 'header' ? (
                  <Text style={styles.sectionHeader}>{item.title}</Text>
                ) : (
                  <Pressable style={styles.coinRow} onPress={() => onPick(item.coin)}>
                    <CoinDisc
                      size={36}
                      tone="copper"
                      label={String(item.coin.year).slice(-2)}
                      imageSource={
                        item.coin.obverseImage ? { uri: item.coin.obverseImage } : undefined
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coinName} numberOfLines={1}>
                        {item.coin.specificCoinName || item.coin.name || item.coin.denomination}
                      </Text>
                      <Text style={styles.coinSub} numberOfLines={1}>
                        {coinSub(item.coin)}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={14} color={palette.fg4} />
                  </Pressable>
                )
              }
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    maxHeight: '75%',
    backgroundColor: palette.bg2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.bg4,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  sheetTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: palette.fg,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  list: { flexGrow: 0 },
  sectionHeader: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg3,
    letterSpacing: 1.14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: palette.line2,
  },
  coinName: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg },
  coinSub: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: palette.fg3,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  emptyState: { paddingVertical: 28 },
  emptyText: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    color: palette.fg3,
    lineHeight: 18,
    textAlign: 'center',
  },
});
