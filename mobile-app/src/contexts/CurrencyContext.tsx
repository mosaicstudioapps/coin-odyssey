import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Logger } from '../services/logger';
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  currencySymbol,
  formatCurrency,
  type CurrencyCode,
} from '@coin-collecting/shared';

// Options and formatting live in packages/shared; re-exported for existing imports.
export { CURRENCY_OPTIONS };
export type { CurrencyCode };

const STORAGE_KEY = 'pref_currency_v1';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => Promise<void>;
  format: (n: number | null | undefined, options?: { compact?: boolean }) => string;
  symbol: string;
  ready: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && CURRENCY_OPTIONS.some((o) => o.code === stored)) {
          setCurrencyState(stored as CurrencyCode);
        }
      } catch (err) {
        Logger.warn('Failed to load currency preference, using default', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setCurrency = useCallback(async (next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      Logger.error('Failed to persist currency preference', err);
    }
  }, []);

  const format = useCallback(
    (n: number | null | undefined, options?: { compact?: boolean }): string =>
      formatCurrency(n, currency, options),
    [currency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      format,
      symbol: currencySymbol(currency),
      ready,
    }),
    [currency, setCurrency, format, ready]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
