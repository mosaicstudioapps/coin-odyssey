import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import {
  MINT_MARK_CHOICES,
  OTHER_CHOICE,
  canonicalizeMintMark,
  isCustomMintMark,
  parseCheckedYear,
  scanCheckPrompt,
  scanCorrection,
  MINT_MARK_UNKNOWN,
  type CoinRecognitionResult,
} from '@coin-collecting/shared';

import { fontFamily, radius, makeStyles, useTheme } from '../../../theme';
import { Button, Card, Eyebrow, Icon } from '../../../components/design';
import { CoinService } from '../../../services/coinService';
import { Logger } from '../../../services/logger';
import type { Coin } from '../../../types/coin';

// "Check these": the year and mint mark, read back for the collector to
// confirm. They decide the album slot, and the scanner's confidence hasn't
// tracked whether it read them right. A correction saves at once and re-files
// the coin (packages/shared, scanCorrection).

interface Props {
  recognition: CoinRecognitionResult;
  coin: Coin;
  onCorrected: (coin: Coin, recognition: CoinRecognitionResult) => void;
  onConfirmed: () => void;
}

export function ScanCheckCard({ recognition, coin, onCorrected, onConfirmed }: Props) {
  const styles = useStyles();
  const { palette, scheme } = useTheme();
  const initialMint = canonicalizeMintMark(recognition.mintMark) ?? MINT_MARK_UNKNOWN;
  const [yearText, setYearText] = useState(recognition.year ? String(recognition.year) : '');
  const [mint, setMint] = useState(initialMint);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The chips, plus whatever odd mark the scanner read (CC, O), so it can be kept.
  const choices = useMemo(() => {
    const base = MINT_MARK_CHOICES.filter(c => c.value !== OTHER_CHOICE);
    return isCustomMintMark(initialMint) ? [...base.slice(0, -1), { value: initialMint, label: initialMint }, base[base.length - 1]] : base;
  }, [initialMint]);

  const year = parseCheckedYear(yearText);
  const changed = year !== recognition.year || mint !== initialMint;

  const save = async () => {
    if (year === null) {
      setError('Enter the year shown on the coin.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fix = scanCorrection(recognition, { year, mintMark: mint });
      const updated = await CoinService.updateCoin(coin.id, fix);
      onCorrected(updated, { ...recognition, year: fix.year, mintMark: fix.mintMark });
    } catch (err) {
      Logger.error('Scan correction failed', err);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headRow}>
        <Icon name="info" size={14} color={palette.goldText} />
        <Eyebrow color={palette.goldText}>CHECK THESE</Eyebrow>
      </View>
      <Text style={styles.prompt}>{scanCheckPrompt(recognition)}</Text>

      <Text style={styles.label}>YEAR</Text>
      <TextInput
        value={yearText}
        onChangeText={t => {
          setYearText(t);
          setError(null);
        }}
        keyboardType="number-pad"
        keyboardAppearance={scheme}
        placeholder="e.g. 1999"
        placeholderTextColor={palette.fg4}
        style={styles.input}
        maxLength={5}
        accessibilityLabel="Year"
      />

      <Text style={styles.label}>MINT MARK</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Mint mark">
        {choices.map(choice => {
          const selected = choice.value === mint;
          return (
            <Pressable
              key={choice.value}
              onPress={() => setMint(choice.value)}
              style={[styles.chip, selected && styles.chipOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        {changed ? (
          <Button label={saving ? 'Saving…' : 'Save correction'} onPress={save} disabled={saving} flex={1} />
        ) : (
          <Button
            label="They match the coin"
            variant="ghost"
            onPress={onConfirmed}
            flex={1}
            leading={<Icon name="check" size={14} color={palette.fg} stroke={2.2} />}
          />
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((palette) => ({
  card: { padding: 16, gap: 8, borderColor: palette.goldDim },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prompt: { fontFamily: fontFamily.ui, fontSize: 13.5, color: palette.fg2, lineHeight: 19, marginBottom: 4 },
  label: { fontFamily: fontFamily.mono, fontSize: 9.5, letterSpacing: 1.1, color: palette.fg3, marginTop: 6 },
  input: {
    fontFamily: fontFamily.ui,
    fontSize: 16,
    color: palette.fg,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: palette.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.bg,
  },
  chipOn: { borderColor: palette.goldDeep, backgroundColor: palette.chipActiveBg },
  chipText: { fontFamily: fontFamily.ui, fontSize: 13, color: palette.fg2 },
  chipTextOn: { color: palette.goldText },
  error: { fontFamily: fontFamily.ui, fontSize: 12.5, color: palette.cLow },
  actions: { flexDirection: 'row', marginTop: 6 },
}));
