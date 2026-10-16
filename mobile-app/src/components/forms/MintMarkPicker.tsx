import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  MINT_MARK_CHOICES as PRESET_CHOICES,
  OTHER_CHOICE as OTHER,
  isCustomMintMark as isCustom,
} from '@coin-collecting/shared';

import { ChoiceRow, Choice, Field } from '../design';

interface Props {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  helper?: string;
}

/**
 * Mint mark entry as an explicit choice rather than free text.
 *
 * A blank text field couldn't distinguish "this coin carries no mint mark"
 * from "nobody looked", and that distinction can't be recovered later — so the
 * form asks for it up front. "Other" covers world mints (CC, O, and the letter
 * marks used outside the US) without limiting the list to US options.
 */
export function MintMarkPicker({ value, onChange, invalid, helper }: Props) {
  const [otherMode, setOtherMode] = useState(() => isCustom(value));

  const selected = otherMode ? OTHER : value.trim() ? value.trim().toUpperCase() : null;

  const handleChoice = (choice: string) => {
    if (choice === OTHER) {
      setOtherMode(true);
      // Keep an existing custom mark; clear a preset so the field starts empty.
      if (!isCustom(value)) onChange('');
      return;
    }
    setOtherMode(false);
    onChange(choice);
  };

  return (
    <View style={styles.wrap}>
      <ChoiceRow
        label="MINT MARK"
        options={PRESET_CHOICES}
        value={selected}
        onChange={handleChoice}
        invalid={invalid}
        helper={helper ?? '"No mark" means you looked and there isn’t one.'}
      />
      {otherMode ? (
        <Field
          label="MARK"
          value={value}
          onChangeText={text => onChange(text.toUpperCase().slice(0, 3))}
          placeholder="CC"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
});
