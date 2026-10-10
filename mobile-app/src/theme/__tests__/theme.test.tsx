// src/theme/__tests__/theme.test.tsx
import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkPalette, lightPalette, Palette } from '../tokens';
import { ThemeProvider, useTheme, makeStyles, resolveScheme } from '../ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

let mockSystemScheme: 'light' | 'dark' | null = 'dark';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

/** WCAG 2 contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b2);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('palettes', () => {
  it('define exactly the same tokens', () => {
    expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort());
  });

  // Reading text must reach WCAG AA (4.5:1) on cards and on the page, in both
  // themes. fg4 is for faint hints and is deliberately exempt.
  const reading: (keyof Palette)[] = ['fg', 'fg2', 'fg3', 'goldText', 'cHigh', 'cMed', 'cLow'];
  for (const [name, palette] of [['dark', darkPalette], ['light', lightPalette]] as const) {
    for (const token of reading) {
      it(`${name} ${token} reads on cards`, () => {
        expect(contrast(palette[token], palette.bg2)).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${name} text on a gold button reads`, () => {
      expect(contrast(palette.goldFg, palette.gold)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('keeps the camera viewfinder dark in light', () => {
    expect(lightPalette.viewfinderLo).toBe(darkPalette.viewfinderLo);
    expect(lightPalette.viewfinderHi).toBe(darkPalette.viewfinderHi);
  });
});

describe('resolveScheme', () => {
  it('follows the phone for System', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
  });

  it('stays dark when the phone reports nothing, as the app did before 1.1', () => {
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', undefined)).toBe('dark');
  });

  it('lets a pinned choice override the phone', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});

describe('ThemeProvider', () => {
  const useStyles = makeStyles(palette => ({ label: { color: palette.fg } }));
  let latest: ReturnType<typeof useTheme> | null = null;

  function Probe() {
    const theme = useTheme();
    const styles = useStyles();
    latest = theme;
    return <Text style={styles.label}>{theme.scheme}</Text>;
  }

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockSystemScheme = 'dark';
    latest = null;
  });

  it('starts on System, following the phone', async () => {
    mockSystemScheme = 'light';
    const screen = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(latest?.ready).toBe(true));
    expect(latest?.preference).toBe('system');
    expect(screen.getByText('light')).toBeTruthy();
    expect(latest?.palette).toBe(lightPalette);
  });

  it('recolors live and remembers the choice', async () => {
    const screen = render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(latest?.ready).toBe(true));
    expect(screen.getByText('dark')).toBeTruthy();

    await act(async () => {
      await latest!.setPreference('light');
    });
    expect(screen.getByText('light')).toBeTruthy();
    expect(screen.getByText('light').props.style).toMatchObject({ color: lightPalette.fg });
    expect(await AsyncStorage.getItem('pref_theme_v1')).toBe('light');
  });

  it('restores a saved choice before reporting ready', async () => {
    await AsyncStorage.setItem('pref_theme_v1', 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(latest?.ready).toBe(true));
    expect(latest?.preference).toBe('light');
    expect(latest?.scheme).toBe('light');
  });

  it('ignores a garbled saved value', async () => {
    await AsyncStorage.setItem('pref_theme_v1', 'sepia');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(latest?.ready).toBe(true));
    expect(latest?.preference).toBe('system');
  });

  it('builds each palette\'s styles once and reuses them', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(latest?.ready).toBe(true));
    const darkStyles = useStylesSnapshot();
    await act(async () => {
      await latest!.setPreference('light');
    });
    await act(async () => {
      await latest!.setPreference('dark');
    });
    expect(useStylesSnapshot()).toBe(darkStyles);

    function useStylesSnapshot() {
      let captured: unknown;
      function Capture() {
        captured = useStyles();
        return null;
      }
      render(<ThemeProvider><Capture /></ThemeProvider>);
      return captured;
    }
  });
});
