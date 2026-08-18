import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { normalizeDenomination } from '@coin-collecting/shared';

import { ChoiceRow, Choice, Field } from '../design';

/** Sentinel for the picker only — never stored. Selecting it reveals a text input. */
const OTHER = '__other__';

/**
 * The US circulating denominations, which is what the albums are built around
 * and what most entries are. Anything else — world coinage, ancients, bullion
 * weights — goes through "Other" as free text.
 */
const PRESET_CHOICES: readonly Choice[] = [
  { value: 'Cent', label: 'Cent' },
  { value: 'Nickel', label: 'Nickel' },
  { value: 'Dime', label: 'Dime' },
  { value: 'Quarter', label: 'Quarter' },
  { value: 'Half Dollar', label: 'Half Dollar' },
  { value: 'Dollar', label: 'Dollar' },
  { value: OTHER, label: 'Other' },
];

/** Canonical form -> the preset that owns it, so "Penny" selects the Cent chip. */
const PRESET_BY_CANONICAL = new Map(
  PRESET_CHOICES.filter(choice => choice.value !== OTHER).map(choice => [
    normalizeDenomination(choice.value),
    choice.value,
  ]),
);

function presetFor(value: string): string | null {
  if (!value.trim()) return null;
  return PRESET_BY_CANONICAL.get(normalizeDenomination(value)) ?? null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  helper?: string;
}

/**
 * Denomination entry as a choice with a free-text escape hatch.
 *
 * Free text let this field fill up with coin *types* — "Commemorative",
 * "Regular issue", "Bullion" — imported from a catalogue whose vocabulary put
 * them there. Those aren't denominations, and matching a coin to an album slot
 * depends on this field naming what the coin is worth. Categories now have
 * their own field; this one offers the denominations directly.
 */
export function DenominationPicker({ value, onChange, invalid, helper }: Props) {
  const [otherMode, setOtherMode] = useState(() => Boolean(value.trim()) && !presetFor(value));

  const selected = otherMode ? OTHER : presetFor(value);

  const handleChoice = (choice: string) => {
    if (choice === OTHER) {
      setOtherMode(true);
      // Keep text that isn't a preset; clear a preset so the field starts empty.
      if (presetFor(value)) onChange('');
      return;
    }
    setOtherMode(false);
    onChange(choice);
  };

  return (
    <View style={styles.wrap}>
      <ChoiceRow
        label="DENOMINATION"
        options={PRESET_CHOICES}
        value={selected}
        onChange={handleChoice}
        invalid={invalid}
        helper={helper ?? 'What the coin is worth — not what kind of issue it is.'}
      />
      {otherMode ? (
        <Field
          label="DENOMINATION"
          value={value}
          onChangeText={onChange}
          placeholder="2 Euro, 5 Pence, Denarius…"
          autoCapitalize="words"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
});
