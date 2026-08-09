import {
  useFonts as useNewsreader,
  Newsreader_400Regular,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

export function useAppFonts(): boolean {
  const [loaded, error] = useNewsreader({
    Newsreader_400Regular,
    Newsreader_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });
  // Fail open. A font that never resolves would otherwise hold App.tsx on its
  // blank `palette.bg` branch forever — an unrecoverable black screen. Degrading
  // to system fonts is always better than showing nothing.
  return loaded || error != null;
}
