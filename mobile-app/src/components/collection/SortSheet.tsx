import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, radius, makeStyles, useTheme } from '../../theme';
import { Button, Eyebrow, Icon } from '../design';

export type SortKey = 'date' | 'value' | 'year' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  key: SortKey;
  direction: SortDirection;
}

export const defaultSort: SortOption = { key: 'date', direction: 'desc' };

const OPTIONS: { key: SortKey; label: string; ascLabel: string; descLabel: string }[] = [
  { key: 'date', label: 'Date added', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { key: 'value', label: 'Value', ascLabel: 'Low → High', descLabel: 'High → Low' },
  { key: 'year', label: 'Year', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { key: 'name', label: 'Alphabetical', ascLabel: 'A → Z', descLabel: 'Z → A' },
];

interface Props {
  visible: boolean;
  sort: SortOption;
  onApply: (sort: SortOption) => void;
  onClose: () => void;
}

export const SortSheet: React.FC<Props> = ({ visible, sort, onApply, onClose }) => {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<SortOption>(sort);

  useEffect(() => {
    if (visible) setDraft(sort);
  }, [visible, sort]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.titleRow}>
          <Eyebrow>SORT BY</Eyebrow>
          <Pressable onPress={onClose} hitSlop={10}>
            <Icon name="x" size={18} color={palette.fg} stroke={2.4} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {OPTIONS.map((opt) => {
            const selected = draft.key === opt.key;
            return (
              <View key={opt.key} style={styles.row}>
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, key: opt.key }))}
                  style={styles.rowMain}
                >
                  <Text style={[styles.label, selected && { color: palette.goldText }]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.radio, selected && styles.radioActive]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
                {selected && (
                  <View style={styles.dirRow}>
                    {(['desc', 'asc'] as SortDirection[]).map((dir) => {
                      const active = draft.direction === dir;
                      const text = dir === 'asc' ? opt.ascLabel : opt.descLabel;
                      return (
                        <Pressable
                          key={dir}
                          onPress={() => setDraft((d) => ({ ...d, direction: dir }))}
                          style={[styles.dirChip, active && styles.dirChipActive]}
                        >
                          <Text style={[styles.dirText, active && styles.dirTextActive]}>
                            {text}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Reset"
            variant="ghost"
            onPress={() => setDraft(defaultSort)}
            flex={1}
          />
          <Button label="Apply" variant="gold" onPress={() => onApply(draft)} flex={1.4} />
        </View>
      </View>
    </Modal>
  );
};

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
    maxHeight: '70%',
    backgroundColor: palette.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingTop: 8,
  },
  sheetHandle: {
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
  row: { paddingHorizontal: 20 },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 15,
    color: palette.fg,
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

  dirRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  },
  dirChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
  },
  dirChipActive: {
    borderColor: palette.gold,
    backgroundColor: palette.chipActiveBg,
  },
  dirText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg3,
    letterSpacing: 0.6,
  },
  dirTextActive: { color: palette.goldText },

  actions: {
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderColor: palette.line,
  },
}));
