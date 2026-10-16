'use client';

// The form's three pickers, matching mobile: choices from packages/shared,
// and "Other" opens a text box for anything outside the presets.
import { useState } from 'react';
import {
  COIN_CATEGORIES,
  COIN_CATEGORY_LABELS,
  DENOMINATION_CHOICES,
  MINT_MARK_CHOICES,
  OTHER_CHOICE,
  denominationPresetFor,
  isCustomMintMark,
} from '@coin-collecting/shared';
import { ChoiceRow, Field } from '@/components/co';

export function DenominationPicker({
  value,
  onChange,
  invalid,
  helper,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  helper?: string;
}) {
  const [otherMode, setOtherMode] = useState(() => Boolean(value.trim()) && !denominationPresetFor(value));
  const selected = otherMode ? OTHER_CHOICE : denominationPresetFor(value) ?? '';
  return (
    <div className="flex flex-col gap-3">
      <ChoiceRow
        label="Denomination"
        options={[...DENOMINATION_CHOICES]}
        value={selected}
        invalid={invalid}
        helper={helper ?? 'What the coin is worth — not what kind of issue it is.'}
        onChange={choice => {
          if (choice === OTHER_CHOICE) {
            setOtherMode(true);
            // Keep text that isn't a preset; clear a preset so the box starts empty.
            if (denominationPresetFor(value)) onChange('');
            return;
          }
          setOtherMode(false);
          onChange(choice);
        }}
      />
      {otherMode && (
        <Field label="Denomination" value={value} onChange={e => onChange(e.target.value)} placeholder="2 Euro, 5 Pence, Denarius…" />
      )}
    </div>
  );
}

export function MintMarkPicker({
  value,
  onChange,
  invalid,
  helper,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  helper?: string;
}) {
  const [otherMode, setOtherMode] = useState(() => isCustomMintMark(value));
  const selected = otherMode ? OTHER_CHOICE : value.trim().toUpperCase();
  return (
    <div className="flex flex-col gap-3">
      <ChoiceRow
        label="Mint mark"
        options={[...MINT_MARK_CHOICES]}
        value={selected}
        invalid={invalid}
        helper={helper ?? '"No mark" means you looked and there isn’t one.'}
        onChange={choice => {
          if (choice === OTHER_CHOICE) {
            setOtherMode(true);
            if (!isCustomMintMark(value)) onChange('');
            return;
          }
          setOtherMode(false);
          onChange(choice);
        }}
      />
      {otherMode && (
        <Field
          label="Mark"
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="CC"
          autoCapitalize="characters"
          autoCorrect="off"
        />
      )}
    </div>
  );
}

const CATEGORY_CHOICES = COIN_CATEGORIES.map(category => ({ value: category, label: COIN_CATEGORY_LABELS[category] }));

/** Optional. Clicking the selected chip clears it, so a mistaken answer can be taken back. */
export function CategoryPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <ChoiceRow
      label="Category"
      options={CATEGORY_CHOICES}
      value={value.trim()}
      onChange={next => onChange(next === value ? '' : next)}
      helper="Optional — what kind of issue this is."
    />
  );
}
