import React from 'react';
import { View, Text } from 'react-native';
import { fontFamily, makeStyles, useTheme } from '../../theme';
import type { Palette } from '../../theme';

export type ConfLevel = 'h' | 'm' | 'l' | 'n';

interface Props {
  level?: ConfLevel;
  score?: number;
  label?: string;
}

function dotColor(palette: Palette): Record<ConfLevel, string> {
  return { h: palette.cHigh, m: palette.cMed, l: palette.cLow, n: palette.cNone };
}

const defaultLabel: Record<ConfLevel, string> = {
  h: 'HIGH',
  m: 'MED',
  l: 'LOW',
  n: '—',
};

export const ConfBadge: React.FC<Props> = ({ level = 'h', score, label }) => {
  const styles = useStyles();
  const { palette } = useTheme();
  const tag = label || defaultLabel[level];
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: dotColor(palette)[level] }]} />
      <Text style={styles.text} numberOfLines={1}>
        {tag}
        {score != null && <Text style={styles.score}>·{score}</Text>}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((palette) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingRight: 7,
    paddingLeft: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    letterSpacing: 0.76,
    color: palette.fg2,
  },
  score: {
    opacity: 0.7,
  },
}));
