import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { AlbumSlot, AlbumDiscTone } from '@coin-collecting/shared';

import { palette, fontFamily } from '../../../theme';
import { CoinDisc } from '../../../components/design';
import type { SlotFill } from '../../../services/albumService';

const DISC_SIZE = 56;

interface Props {
  slot: AlbumSlot;
  fill?: SlotFill;
  tone: AlbumDiscTone;
  onPress: (slot: AlbumSlot, fill?: SlotFill) => void;
}

export const AlbumSlotCell = React.memo(function AlbumSlotCell({
  slot,
  fill,
  tone,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.cell} onPress={() => onPress(slot, fill)}>
      {fill ? (
        <View style={styles.discWrap}>
          <CoinDisc
            size={DISC_SIZE}
            tone={tone}
            label={String(slot.match.kind === 'country' ? '' : slot.label).slice(0, 4)}
            imageSource={fill.coin.obverseImage ? { uri: fill.coin.obverseImage } : undefined}
          />
          <View style={styles.filledDot} />
          {fill.coinCount != null && fill.coinCount > 1 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{fill.coinCount}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyDisc}>
          <Text style={styles.emptyMark}>·</Text>
        </View>
      )}
      <Text style={[styles.label, fill ? styles.labelFilled : styles.labelEmpty]} numberOfLines={2}>
        {slot.label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  discWrap: { position: 'relative' },
  filledDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.gold,
    borderWidth: 1.5,
    borderColor: palette.bg,
  },
  countBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: palette.bg4,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 8.5,
    color: palette.fg2,
  },
  emptyDisc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMark: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    color: palette.fg4,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 8.5,
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 11,
  },
  labelFilled: { color: palette.fg2 },
  labelEmpty: { color: palette.fg4 },
});
