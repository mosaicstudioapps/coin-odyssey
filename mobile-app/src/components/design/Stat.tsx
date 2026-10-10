import React from 'react';
import { View, Text } from 'react-native';
import { fontFamily, radius, spacing, makeStyles } from '../../theme';

interface Props {
  eyebrow: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
}

export const Stat: React.FC<Props> = ({ eyebrow, value, suffix, delta, deltaDir = 'up' }) => {
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {delta ? (
        <Text style={[styles.delta, deltaDir === 'down' && styles.deltaDown]}>
          {deltaDir === 'up' ? '▲' : '▼'} {delta}
        </Text>
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((palette) => ({
  tile: {
    padding: spacing.padLg,
    gap: 8,
    borderRadius: radius.base,
    backgroundColor: palette.bg2,
    borderWidth: 1,
    borderColor: palette.line,
  },
  eyebrow: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    letterSpacing: 1.33,
    textTransform: 'uppercase',
    color: palette.fg3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: palette.fg,
  },
  suffix: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
  },
  delta: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.cHigh,
  },
  deltaDown: {
    color: palette.cLow,
  },
}));
