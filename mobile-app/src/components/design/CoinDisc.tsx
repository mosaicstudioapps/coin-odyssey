import React from 'react';
import { View, Text, StyleSheet, ImageSourcePropType, Image } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { fontFamily, makeStyles, useTheme } from '../../theme';
import type { Palette } from '../../theme';

export type DiscTone = 'gold' | 'silver' | 'copper';

interface Props {
  size?: number;
  label?: string;
  tone?: DiscTone;
  imageSource?: ImageSourcePropType;
}

function toneColors(palette: Palette): Record<DiscTone, [string, string, string]> {
  return {
    gold:   [palette.goldCoinHi, palette.goldCoinMid, palette.goldCoinLo],
    silver: [palette.silverHi,   palette.silverMid,   palette.silverLo],
    copper: [palette.copperHi,   palette.copperMid,   palette.copperLo],
  };
}

export const CoinDisc: React.FC<Props> = ({ size = 56, label = 'OBV', tone = 'gold', imageSource }) => {
  const styles = useStyles();
  const { palette, scheme } = useTheme();
  const [hi, mid, lo] = toneColors(palette)[tone];
  const labelSize = Math.max(7.5, size * 0.13);
  const innerInset = size * 0.08;
  const gradientId = `coin-${scheme}-${tone}-${size}`;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id={gradientId}
            cx={size * 0.3}
            cy={size * 0.25}
            rx={size}
            ry={size}
            fx={size * 0.3}
            fy={size * 0.25}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={hi} />
            <Stop offset="45%" stopColor={mid} />
            <Stop offset="100%" stopColor={lo} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
      </Svg>
      {imageSource ? (
        <Image source={imageSource} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} resizeMode="cover" />
      ) : (
        <>
          <View
            style={[
              styles.dashRing,
              {
                top: innerInset,
                left: innerInset,
                right: innerInset,
                bottom: innerInset,
                borderRadius: (size - innerInset * 2) / 2,
              },
            ]}
          />
          <Text style={[styles.label, { fontSize: labelSize }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
      <View style={[styles.innerHighlight, { borderRadius: size / 2 }]} pointerEvents="none" />
    </View>
  );
};

const useStyles = makeStyles((palette) => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.bg3,
  },
  dashRing: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.discRing,
  },
  label: {
    fontFamily: fontFamily.mono,
    color: palette.discLabel,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: palette.discHighlight,
  },
}));
