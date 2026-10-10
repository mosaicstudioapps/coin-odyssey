'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from './themeCss';

// The web side of Settings > Theme. Same three choices as the mobile app:
// System follows the device and updates live; Light and Dark pin one.

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: "Match your device's appearance setting" },
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
];

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function apply(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The bootstrap script already applied the saved choice before paint; this
  // just lets React know what it was.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreferenceState(readStored());
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing or blocked storage: the choice lasts for this visit.
    }
  }, []);

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
