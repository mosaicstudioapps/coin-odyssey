import React from 'react';
import { COIN_CATEGORIES, COIN_CATEGORY_LABELS } from '@coin-collecting/shared';

import { ChoiceRow, Choice } from '../design';

const CHOICES: readonly Choice[] = COIN_CATEGORIES.map(category => ({
  value: category,
  label: COIN_CATEGORY_LABELS[category],
}));

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * What kind of issue this coin is. Optional — unlike a mint mark, the answer
 * stays readable off the coin itself, so a blank one can be filled in later.
 * Its real job is giving "Commemorative" and "Bullion" a home of their own, so
 * they stop being filed as denominations.
 */
export function CategoryPicker({ value, onChange }: Props) {
  return (
    <ChoiceRow
      label="CATEGORY"
      options={CHOICES}
      value={value.trim() ? value.trim() : null}
      // Tapping the selected chip clears it — the field is optional, so there
      // has to be a way back out of an answer given by mistake.
      onChange={next => onChange(next === value ? '' : next)}
      helper="Optional — what kind of issue this is."
    />
  );
}
