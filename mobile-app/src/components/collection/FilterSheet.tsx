import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, radius, makeStyles, useTheme } from '../../theme';
import { Button, Eyebrow, Icon } from '../design';

export interface CoinFilters {
  countries: string[];
  minYear: number | null;
  maxYear: number | null;
  minValue: number | null;
  maxValue: number | null;
  minGrade: number | null;
}

export const defaultFilters: CoinFilters = {
  countries: [],
  minYear: null,
  maxYear: null,
  minValue: null,
  maxValue: null,
  minGrade: null,
};

const GRADE_OPTIONS = [
  { label: 'Any', value: null },
  { label: 'G-6+', value: 6 },
  { label: 'VG-10+', value: 10 },
  { label: 'F-15+', value: 15 },
  { label: 'VF-30+', value: 30 },
  { label: 'XF-45+', value: 45 },
  { label: 'AU-55+', value: 55 },
  { label: 'MS-60+', value: 60 },
  { label: 'MS-65+', value: 65 },
];

interface Props {
  visible: boolean;
  filters: CoinFilters;
  countries: string[];
  onApply: (filters: CoinFilters) => void;
  onClose: () => void;
}

function parseInputNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const FilterSheet: React.FC<Props> = ({
  visible,
  filters,
  countries,
  onApply,
  onClose,
}) => {
  const styles = useStyles();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<CoinFilters>(filters);

  // Local string state so the user can type partial / empty values
  const [minYearStr, setMinYearStr] = useState('');
  const [maxYearStr, setMaxYearStr] = useState('');
  const [minValStr, setMinValStr] = useState('');
  const [maxValStr, setMaxValStr] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setMinYearStr(filters.minYear != null ? String(filters.minYear) : '');
      setMaxYearStr(filters.maxYear != null ? String(filters.maxYear) : '');
      setMinValStr(filters.minValue != null ? String(filters.minValue) : '');
      setMaxValStr(filters.maxValue != null ? String(filters.maxValue) : '');
    }
  }, [visible, filters]);

  const toggleCountry = (country: string) => {
    setDraft((d) => ({
      ...d,
      countries: d.countries.includes(country)
        ? d.countries.filter((c) => c !== country)
        : [...d.countries, country],
    }));
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (draft.countries.length) n++;
    if (draft.minYear != null || draft.maxYear != null) n++;
    if (draft.minValue != null || draft.maxValue != null) n++;
    if (draft.minGrade != null) n++;
    return n;
  }, [draft]);

  const handleApply = () => {
    onApply({
      ...draft,
      minYear: parseInputNum(minYearStr),
      maxYear: parseInputNum(maxYearStr),
      minValue: parseInputNum(minValStr),
      maxValue: parseInputNum(maxValStr),
    });
  };

  const handleClear = () => {
    setDraft(defaultFilters);
    setMinYearStr('');
    setMaxYearStr('');
    setMinValStr('');
    setMaxValStr('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.titleRow}>
          <Eyebrow>FILTERS {activeCount > 0 ? `· ${activeCount}` : ''}</Eyebrow>
          <Pressable onPress={onClose} hitSlop={10}>
            <Icon name="x" size={18} color={palette.fg} stroke={2.4} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Country */}
          <Text style={styles.sectionLabel}>COUNTRY</Text>
          {countries.length === 0 ? (
            <Text style={styles.helperText}>Add a coin to start filtering by country.</Text>
          ) : (
            <View style={styles.chipsWrap}>
              {countries.map((c) => {
                const active = draft.countries.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => toggleCountry(c)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Year range */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>YEAR</Text>
          <View style={styles.rangeRow}>
            <RangeField label="From" value={minYearStr} onChange={setMinYearStr} placeholder="1900" />
            <RangeField label="To" value={maxYearStr} onChange={setMaxYearStr} placeholder="2026" />
          </View>

          {/* Value range */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>VALUE (USD)</Text>
          <View style={styles.rangeRow}>
            <RangeField label="Min" value={minValStr} onChange={setMinValStr} placeholder="0" />
            <RangeField label="Max" value={maxValStr} onChange={setMaxValStr} placeholder="1000" />
          </View>

          {/* Grade */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>MIN GRADE</Text>
          <View style={styles.chipsWrap}>
            {GRADE_OPTIONS.map((g) => {
              const active = draft.minGrade === g.value;
              return (
                <Pressable
                  key={g.label}
                  onPress={() => setDraft((d) => ({ ...d, minGrade: g.value }))}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button label="Clear" variant="ghost" onPress={handleClear} flex={1} />
          <Button label="Apply" variant="gold" onPress={handleApply} flex={1.4} />
        </View>
      </View>
    </Modal>
  );
};

function RangeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  const styles = useStyles();
  const { palette, scheme } = useTheme();
  return (
    <View style={styles.rangeCol}>
      <Text style={styles.rangeLabel}>{label}</Text>
      <TextInput
        keyboardAppearance={scheme}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={palette.fg4}
        keyboardType="number-pad"
        style={styles.rangeInput}
      />
    </View>
  );
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
    maxHeight: '88%',
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
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scroll: { paddingHorizontal: 20 },

  sectionLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.fg3,
    marginBottom: 10,
  },
  helperText: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: palette.fg4,
  },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipActive: {
    borderColor: palette.gold,
    backgroundColor: palette.chipActiveBg,
  },
  chipText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: palette.fg2,
    letterSpacing: 0.6,
  },
  chipTextActive: { color: palette.goldText },

  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeCol: { flex: 1, gap: 6 },
  rangeLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: palette.fg3,
    letterSpacing: 1.1,
  },
  rangeInput: {
    fontFamily: fontFamily.ui,
    fontSize: 15,
    color: palette.fg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: palette.bg2,
    minHeight: 42,
  },

  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderColor: palette.line,
  },
}));
