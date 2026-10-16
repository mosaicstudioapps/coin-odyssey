// The add/edit coin form: its fields, validation, the picker choices, and the
// conversion between a coin and the form. Shared so the mobile and web forms
// accept and save exactly the same things. Moved from mobile-app (CoinForm,
// the three pickers, AddCoinScreen, EditCoinScreen) in the web plan.
import type { Coin, CoinCategory, CoinSource } from '../types/coin';
import { coerceCoinCategory } from '../types/coin';
import { MINT_MARK_NONE, MINT_MARK_UNKNOWN, normalizeDenomination } from './normalize';

export interface CoinFormValues {
  name: string;
  year: string;
  denomination: string;
  country: string;
  category: string;
  mintMark: string;
  grade: string;
  series: string;
  designer: string;
  faceValue: string;
  purchasePrice: string;
  purchaseDate: string;
  notes: string;
  /** A stored photo path or URL, or a new local file/blob URL to upload. */
  obverseUri: string | null;
  reverseUri: string | null;
}

export const emptyCoinForm: CoinFormValues = {
  name: '',
  year: '',
  denomination: '',
  country: '',
  category: '',
  mintMark: '',
  grade: '',
  series: '',
  designer: '',
  faceValue: '',
  purchasePrice: '',
  purchaseDate: '',
  notes: '',
  obverseUri: null,
  reverseUri: null,
};

export interface CoinFormErrors {
  name?: string;
  year?: string;
  denomination?: string;
  mintMark?: string;
}

export function validateCoinForm(values: CoinFormValues): CoinFormErrors {
  const errors: CoinFormErrors = {};
  if (!values.name.trim()) errors.name = 'Required';
  if (!values.year.trim() || Number.isNaN(Number(values.year))) errors.year = 'Enter a year';
  if (!values.denomination.trim()) errors.denomination = 'Required';
  // Blank can't be allowed through: it would mean both "no mint mark" and
  // "didn't check", and nothing downstream could tell them apart. "Not sure"
  // is the honest answer when the coin is worn or the collector is unsure.
  if (!values.mintMark.trim()) errors.mintMark = 'Pick one — "Not sure" is fine';
  return errors;
}

export function coinToFormValues(coin: Coin): CoinFormValues {
  return {
    name: coin.name ?? '',
    year: coin.year != null ? String(coin.year) : '',
    denomination: coin.denomination ?? '',
    country: coin.country ?? '',
    category: coin.category ?? '',
    mintMark: coin.mintMark ?? '',
    grade: coin.grade ?? '',
    series: coin.series ?? '',
    designer: coin.designer ?? '',
    faceValue: coin.faceValue != null ? String(coin.faceValue) : '',
    purchasePrice: coin.purchasePrice != null ? String(coin.purchasePrice) : '',
    purchaseDate: coin.purchaseDate ?? '',
    notes: coin.notes ?? '',
    obverseUri: coin.obverseImage ?? null,
    reverseUri: coin.reverseImage ?? null,
  };
}

/** The coin fields a form save writes. Photos are handled by each app. */
export interface CoinFormFields {
  name: string;
  year: number;
  denomination: string;
  country?: string | null;
  category?: CoinCategory | null;
  source?: CoinSource;
  mintMark?: string | null;
  grade?: string | null;
  series?: string | null;
  designer?: string | null;
  faceValue?: number | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  notes?: string | null;
}

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Form values to the fields to save.
 *
 * Creating: empty fields are left out, and the coin is marked as added by hand.
 * Updating: empty fields are sent as null, so clearing a field clears it. (Until
 * 2026-10 the mobile edit screen left them out, so a cleared note or grade came
 * back after saving.)
 */
export function formValuesToFields(values: CoinFormValues, mode: 'create' | 'update'): CoinFormFields {
  const text = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
    return mode === 'update' ? null : undefined;
  };
  const amount = (value: string) => {
    const n = parseAmount(value);
    if (n != null) return n;
    return mode === 'update' ? null : undefined;
  };
  const fields: CoinFormFields = {
    name: values.name.trim(),
    year: parseInt(values.year, 10),
    denomination: values.denomination.trim(),
    country: text(values.country),
    // Creating leaves a blank category out; updating clears it with null.
    category: mode === 'update' ? coerceCoinCategory(values.category) : coerceCoinCategory(values.category) ?? undefined,
    mintMark: text(values.mintMark),
    grade: text(values.grade),
    series: text(values.series),
    designer: text(values.designer),
    faceValue: amount(values.faceValue),
    purchasePrice: amount(values.purchasePrice),
    purchaseDate: text(values.purchaseDate),
    notes: text(values.notes),
  };
  if (mode === 'create') fields.source = 'manual';
  // Drop undefined keys so a create sends only what was entered.
  for (const key of Object.keys(fields) as (keyof CoinFormFields)[]) {
    if (fields[key] === undefined) delete fields[key];
  }
  return fields;
}

// ---------------------------------------------------------------- pickers

export interface FormChoice {
  value: string;
  label: string;
}

/** Picker-only value that reveals a text box. Never stored. */
export const OTHER_CHOICE = '__other__';

/**
 * The US circulating denominations, which the albums are built around and
 * most entries are. Anything else (world coins, ancients, bullion weights)
 * goes through "Other" as free text.
 */
export const DENOMINATION_CHOICES: readonly FormChoice[] = [
  { value: 'Cent', label: 'Cent' },
  { value: 'Nickel', label: 'Nickel' },
  { value: 'Dime', label: 'Dime' },
  { value: 'Quarter', label: 'Quarter' },
  { value: 'Half Dollar', label: 'Half Dollar' },
  { value: 'Dollar', label: 'Dollar' },
  { value: OTHER_CHOICE, label: 'Other' },
];

const DENOMINATION_PRESET_BY_CANONICAL = new Map(
  DENOMINATION_CHOICES.filter(c => c.value !== OTHER_CHOICE).map(c => [normalizeDenomination(c.value), c.value])
);

/** The preset chip a denomination belongs to ("Penny" selects Cent), or null. */
export function denominationPresetFor(value: string): string | null {
  if (!value.trim()) return null;
  return DENOMINATION_PRESET_BY_CANONICAL.get(normalizeDenomination(value)) ?? null;
}

export const MINT_MARK_CHOICES: readonly FormChoice[] = [
  { value: MINT_MARK_NONE, label: 'No mark' },
  { value: 'P', label: 'P' },
  { value: 'D', label: 'D' },
  { value: 'S', label: 'S' },
  { value: 'W', label: 'W' },
  { value: OTHER_CHOICE, label: 'Other' },
  { value: MINT_MARK_UNKNOWN, label: 'Not sure' },
];

const MINT_MARK_PRESETS = new Set(MINT_MARK_CHOICES.map(c => c.value).filter(v => v !== OTHER_CHOICE));

/** A mint mark typed into "Other" (CC, O, world mints) rather than one of the chips. */
export function isCustomMintMark(value: string): boolean {
  const mark = value.trim().toUpperCase();
  return mark !== '' && !MINT_MARK_PRESETS.has(mark);
}
