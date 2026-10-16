// The display currency setting: which symbol money amounts (a coin's purchase
// price) are shown with. It changes the symbol only and converts nothing.
// Moved from mobile-app/src/contexts/CurrencyContext.tsx in Phase 1 of the
// web plan; each app keeps its own storage for the choice.

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return CURRENCY_OPTIONS.some(option => option.code === value);
}

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCY_OPTIONS.find(option => option.code === code)?.symbol ?? '$';
}

/** An amount in the chosen currency. Non-numbers show as zero. */
export function formatCurrency(
  n: number | null | undefined,
  currency: CurrencyCode,
  options?: { compact?: boolean }
): string {
  const value = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  try {
    const fractionDigits = currency === 'JPY' ? 0 : 2;
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: options?.compact ? 0 : fractionDigits,
      minimumFractionDigits: options?.compact ? 0 : fractionDigits,
    });
  } catch {
    return `${currencySymbol(currency)}${value.toFixed(2)}`;
  }
}
