import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkPalette, lightPalette, Palette } from './tokens';
import { Logger } from '../services/logger';

// The active color theme. "system" follows the phone's appearance setting
// live; "light" and "dark" pin one. Screens read colors through useTheme()
// or makeStyles(), so a change recolors the whole app without a restart.

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const STORAGE_KEY = 'pref_theme_v1';

interface ThemeContextValue {
  palette: Palette;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  /** False until the saved preference has been read, so the first frame isn't the wrong theme. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined
): ColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  // The app was dark-only before 1.1, so an unknown system setting stays dark.
  return system === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (isPreference(stored)) setPreferenceState(stored);
      } catch (err) {
        Logger.warn('Failed to load theme preference, following the system', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      Logger.warn('Failed to save theme preference', err);
    }
  }, []);

  const scheme = resolveScheme(preference, system);
  const value = useMemo<ThemeContextValue>(
    () => ({
      palette: scheme === 'light' ? lightPalette : darkPalette,
      scheme,
      preference,
      setPreference,
      ready,
    }),
    [scheme, preference, setPreference, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

/**
 * Define a component's styles from the palette. Returns a hook that gives the
 * styles for the active theme. Each palette's styles are built once and
 * cached, so switching themes only rebuilds what hasn't been seen yet.
 *
 *   const useStyles = makeStyles(palette => ({ root: { backgroundColor: palette.bg } }));
 *   function Screen() { const styles = useStyles(); ... }
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (palette: Palette) => T
): () => T {
  const cache = new Map<Palette, T>();
  return function useStyles(): T {
    const { palette } = useTheme();
    let styles = cache.get(palette);
    if (!styles) {
      styles = StyleSheet.create(factory(palette));
      cache.set(palette, styles);
    }
    return styles;
  };
}
