import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';

import { palette, fontFamily, radius } from '../../theme';

export interface Choice {
  value: string;
  label: string;
}

interface Props {
  label: string;
  options: readonly Choice[];
  /** Currently selected value, or null when nothing has been chosen yet. */
  value: string | null;
  onChange: (value: string) => void;
  helper?: string;
  invalid?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * A wrapping row of single-select chips, styled to sit alongside Field in the
 * coin form. Used where free text let collectors invent their own vocabulary —
 * the value written to the database has to come from a fixed set.
 */
export const ChoiceRow: React.FC<Props> = ({
  label,
  options,
  value,
  onChange,
  helper,
  invalid,
  containerStyle,
}) => (
  <View style={[styles.wrap, containerStyle]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.chips}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
            style={[styles.chip, selected && styles.chipSelected, invalid && !value && styles.chipInvalid]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    {helper ? (
      <Text style={[styles.helper, invalid && { color: palette.cLow }]}>{helper}</Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.fg3,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: palette.bg2,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: palette.goldDeep,
    backgroundColor: palette.chipActiveBg,
  },
  chipInvalid: {
    borderColor: palette.cLow,
  },
  chipText: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    color: palette.fg2,
  },
  chipTextSelected: {
    color: palette.gold,
  },
  helper: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg4,
    letterSpacing: 0.5,
  },
});
