import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette, radius } from '../../theme';

interface Props {
  /** 0–1, clamped. */
  value: number;
  height?: number;
}

export const ProgressBar: React.FC<Props> = ({ value, height = 4 }) => {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, height, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: palette.bg4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: palette.gold,
  },
});
