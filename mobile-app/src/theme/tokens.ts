// Coin Odyssey Mobile — design tokens.
//
// Colors, spacing, radius, and type sizes come from packages/shared, the
// same values the web app uses. Only the font family names stay here: they
// are Expo font asset names, which differ from the web's CSS font names.
export {
  darkPalette,
  lightPalette,
  spacing,
  radius,
  fontSize,
  letterSpacing,
} from '@coin-collecting/shared';
export type { Palette, Spacing, Radius } from '@coin-collecting/shared';

export const fontFamily = {
  display: 'Newsreader_400Regular',
  displayMedium: 'Newsreader_500Medium',
  ui:      'DMSans_400Regular',
  uiMedium:'DMSans_500Medium',
  uiSemibold: 'DMSans_600SemiBold',
  mono:    'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;
