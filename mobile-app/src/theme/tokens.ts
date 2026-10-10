// Coin Odyssey Mobile — design tokens
// Hex values converted from the oklch source in the design bundle.
// Source: .design-extract/coin-odyssey/project/styles.css

/**
 * The dark palette, the app's original look. Every color in the app comes
 * from a palette; screens read the active one from the theme (useTheme /
 * makeStyles), so switching themes recolors everything live.
 */
export const darkPalette = {
  // Surfaces (warm near-black, editorial)
  bg:   '#0f0b09',
  bg2:  '#1b1613',
  bg3:  '#251f1b',
  bg4:  '#312a24',
  line:  'rgba(255, 255, 255, 0.08)',
  line2: 'rgba(255, 255, 255, 0.04)',

  // Text
  fg:  '#f7f5f1',
  fg2: '#bbb7b0',
  // Lifted from #7f7973 in 1.1 so labels reach 4.5:1 on cards.
  fg3: '#857f79',
  fg4: '#514c46',

  // Accent — warm gold. `gold` fills (buttons, bars); `goldText` is gold used
  // as text or icon strokes, which needs to be deeper on a light background.
  gold:     '#e7b551',
  goldText: '#e7b551',
  goldDeep: '#ae7c00',
  goldDim:  '#6b5018',
  goldFg:   '#100c0a',

  // Confidence
  cHigh: '#69c27e',
  cMed:  '#eab444',
  cLow:  '#f0834e',
  cNone: '#75716b',

  // Disc gradients
  goldCoinHi:  '#5d4a24',
  goldCoinMid: '#332710',
  goldCoinLo:  '#1c1508',
  silverHi:    '#6c7378',
  silverMid:   '#363b3f',
  silverLo:    '#1e2225',
  copperHi:    '#924d35',
  copperMid:   '#502515',
  copperLo:    '#2d1107',
  // Marks drawn on top of a disc
  discLabel:     'rgba(255, 255, 255, 0.42)',
  discRing:      'rgba(255, 255, 255, 0.08)',
  discHighlight: 'rgba(255, 255, 255, 0.05)',
  // Dashed outline of an empty album slot, or the spinner ring in a scan
  emptyRing:     'rgba(255, 255, 255, 0.14)',

  // Camera viewfinder gradient
  viewfinderHi: '#2e2722',
  viewfinderLo: '#0c0806',

  // Scan CTA gradient
  ctaTopWarm: '#3d2a02',
  ctaBotWarm: '#1b150b',
  ctaBorder:  'rgba(93, 67, 4, 0.6)',

  // Disclaimer card
  warnBorder: 'rgba(125, 70, 11, 0.6)',
  warnBg:     'rgba(59, 34, 13, 0.4)',

  // Chip / pill highlights
  chipActiveBg:    'rgba(61, 42, 2, 0.4)',
  rowSelectedBg:   'rgba(46, 38, 24, 0.3)',
  mapBg:           '#1a1511',
  mapBgWarmInner:  '#28231c',

  // Pin / disc accents
  goldRing:     '#48381a',
  pinDotBright: '#fff0d4',

  // Dimmed backdrop behind sheets and dialogs
  scrim:       'rgba(0, 0, 0, 0.55)',
  scrimStrong: 'rgba(0, 0, 0, 0.72)',
};

export type Palette = { readonly [K in keyof typeof darkPalette]: string };

/**
 * The light palette: warm card stock instead of black, the same gold, and
 * coin discs in polished metal. Approved 2026-10-10. Every text color reaches
 * WCAG AA (4.5:1) on cards except fg4, which is for faint hints, as in dark.
 */
export const lightPalette: Palette = {
  bg:   '#f4efe7',
  bg2:  '#fffcf7',
  bg3:  '#ebe4d9',
  bg4:  '#ddd3c4',
  line:  'rgba(60, 40, 20, 0.12)',
  line2: 'rgba(60, 40, 20, 0.06)',

  fg:  '#1d1712',
  fg2: '#4d443c',
  fg3: '#766b61',
  fg4: '#a1968b',

  gold:     '#d9a440',
  goldText: '#875800',
  goldDeep: '#875800',
  goldDim:  '#e8cf9a',
  goldFg:   '#1d1408',

  cHigh: '#2c7a41',
  cMed:  '#8f6200',
  cLow:  '#b0501c',
  cNone: '#80776e',

  goldCoinHi:  '#f2d48c',
  goldCoinMid: '#d2a24a',
  goldCoinLo:  '#a3731f',
  silverHi:    '#f1f3f4',
  silverMid:   '#c3c8cc',
  silverLo:    '#8b9298',
  copperHi:    '#f2b896',
  copperMid:   '#cd7b55',
  copperLo:    '#94492a',
  discLabel:     'rgba(40, 24, 8, 0.55)',
  discRing:      'rgba(40, 24, 8, 0.16)',
  discHighlight: 'rgba(255, 255, 255, 0.35)',
  emptyRing:     'rgba(60, 40, 20, 0.22)',

  // The camera stays dark in both themes.
  viewfinderHi: '#2e2722',
  viewfinderLo: '#0c0806',

  ctaTopWarm: '#f5e1b3',
  ctaBotWarm: '#fbf2df',
  ctaBorder:  'rgba(170, 120, 20, 0.35)',

  warnBorder: 'rgba(170, 100, 20, 0.45)',
  warnBg:     'rgba(230, 170, 90, 0.16)',

  chipActiveBg:    'rgba(217, 164, 64, 0.22)',
  rowSelectedBg:   'rgba(217, 164, 64, 0.12)',
  mapBg:           '#ece4d6',
  mapBgWarmInner:  '#e3d8c5',

  goldRing:     '#d8bd83',
  pinDotBright: '#875800',

  scrim:       'rgba(20, 14, 8, 0.45)',
  scrimStrong: 'rgba(20, 14, 8, 0.6)',
};

export const spacing = {
  pad:   16,
  padLg: 20,
  gap:   14,
  gapSm: 10,
  xs:    4,
  sm:    8,
  md:    12,
} as const;

export const radius = {
  sm:   10,
  base: 14,
  lg:   20,
  pill: 999,
} as const;

export const fontSize = {
  display:   30,
  displayLg: 52,
  displayMd: 28,
  displaySm: 22,
  body:      14,
  bodyLg:    15,
  bodyMd:    13,
  small:     12,
  micro:     11,
  eyebrow:   10.5,
  tiny:      9.5,
} as const;

export const fontFamily = {
  display: 'Newsreader_400Regular',
  displayMedium: 'Newsreader_500Medium',
  ui:      'DMSans_400Regular',
  uiMedium:'DMSans_500Medium',
  uiSemibold: 'DMSans_600SemiBold',
  mono:    'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const letterSpacing = {
  tight:    -0.6,   // display
  body:     0,
  mono:     0.06,
  monoWide: 0.14,
  eyebrow:  0.14,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
