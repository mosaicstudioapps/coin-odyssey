import React from 'react';
import { View, Text } from 'react-native';
import { fontFamily, makeStyles } from '../../theme';

interface Props {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  titleSize?: number;
}

export const ScreenHeader: React.FC<Props> = ({ eyebrow, title, right, titleSize = 30 }) => {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <View style={styles.col}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right as any}
    </View>
  );
};

const useStyles = makeStyles((palette) => ({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  col: {
    flexDirection: 'column',
    gap: 6,
    flex: 1,
  },
  eyebrow: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    letterSpacing: 1.47,
    textTransform: 'uppercase',
    color: palette.fg3,
  },
  title: {
    fontFamily: fontFamily.display,
    letterSpacing: -0.6,
    color: palette.fg,
  },
}));
