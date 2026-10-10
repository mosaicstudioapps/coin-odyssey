import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, radius, makeStyles, useTheme, THEME_OPTIONS, ThemePreference } from '../../theme';
import { Eyebrow, Icon } from '../design';

const HINTS: Record<ThemePreference, string> = {
  system: "Match your phone's appearance setting",
  light: 'Always light',
  dark: 'Always dark',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Sheet for Settings > Theme. Choosing an option recolors the app immediately. */
export const ThemePicker: React.FC<Props> = ({ visible, onClose }) => {
  const styles = useStyles();
  const { palette, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Eyebrow>THEME</Eyebrow>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="x" size={18} color={palette.fg} stroke={2.4} />
          </Pressable>
        </View>
        {THEME_OPTIONS.map(option => {
          const selected = option.value === preference;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setPreference(option.value);
                onClose();
              }}
              style={styles.row}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, selected && { color: palette.goldText }]}>{option.label}</Text>
                <Text style={styles.hint}>{HINTS[option.value]}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioActive]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
};

export function themePreferenceLabel(preference: ThemePreference): string {
  return THEME_OPTIONS.find(option => option.value === preference)?.label ?? 'System';
}

const useStyles = makeStyles((palette) => ({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.line,
    marginBottom: 12,
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: palette.line2,
  },
  name: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    color: palette.fg,
  },
  hint: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: palette.fg3,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: palette.gold },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold },
}));
