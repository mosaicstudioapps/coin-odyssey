'use client';

// Display currency: which symbol money amounts are shown with. Symbol only,
// no conversion; the options and formatting are shared with mobile.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_CURRENCY,
  currencySymbol,
  formatCurrency,
  isCurrencyCode,
  type CurrencyCode,
} from '@coin-collecting/shared';

const STORAGE_KEY = 'co-currency';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  format: (n: number | null | undefined, options?: { compact?: boolean }) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isCurrencyCode(stored)) setCurrencyState(stored);
    } catch {
      // Storage blocked: keep the default.
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // The choice lasts for this visit.
    }
  }, []);

  const format = useCallback(
    (n: number | null | undefined, options?: { compact?: boolean }) => formatCurrency(n, currency, options),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, symbol: currencySymbol(currency) }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error('useCurrency must be used inside CurrencyProvider');
  return value;
}
