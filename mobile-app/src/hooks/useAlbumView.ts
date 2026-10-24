import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Album, AlbumView } from '@coin-collecting/shared';

// Which layout each quarter album is shown in: a P and a D slot per design,
// like a folder (the default), or one slot per design. Remembered per album on
// this device; the web app keeps its own choice.

const KEY_PREFIX = 'album_view_v1:';

export const DEFAULT_ALBUM_VIEW: AlbumView = 'mint';

export async function readAlbumView(album: Pick<Album, 'id' | 'mintVariants'>): Promise<AlbumView> {
  if (!album.mintVariants) return 'design';
  try {
    const saved = await AsyncStorage.getItem(KEY_PREFIX + album.id);
    if (saved === 'mint' || saved === 'design') return saved;
  } catch {
    // Unreadable storage: fall back to the default.
  }
  return DEFAULT_ALBUM_VIEW;
}

export function useAlbumView(album: Pick<Album, 'id' | 'mintVariants'> | undefined) {
  const [view, setViewState] = useState<AlbumView>(album?.mintVariants ? DEFAULT_ALBUM_VIEW : 'design');

  useEffect(() => {
    let live = true;
    if (album) {
      readAlbumView(album).then(saved => {
        if (live) setViewState(saved);
      });
    }
    return () => {
      live = false;
    };
  }, [album]);

  const setView = useCallback(
    (next: AlbumView) => {
      setViewState(next);
      if (album) AsyncStorage.setItem(KEY_PREFIX + album.id, next).catch(() => {});
    },
    [album]
  );

  return [view, setView] as const;
}
