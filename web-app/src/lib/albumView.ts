'use client';

// Which layout each quarter album is shown in: a P and a D slot per design,
// like a folder (the default), or one slot per design. Remembered per album in
// this browser; the mobile app keeps its own choice.
import { useCallback, useEffect, useState } from 'react';
import type { Album, AlbumView } from '@coin-collecting/shared';

const KEY_PREFIX = 'co-album-view:';

export const DEFAULT_ALBUM_VIEW: AlbumView = 'mint';

export function readAlbumView(album: Pick<Album, 'id' | 'mintVariants'>): AlbumView {
  if (!album.mintVariants) return 'design';
  try {
    const saved = window.localStorage.getItem(KEY_PREFIX + album.id);
    if (saved === 'mint' || saved === 'design') return saved;
  } catch {
    // Storage blocked: fall back to the default.
  }
  return DEFAULT_ALBUM_VIEW;
}

export function useAlbumView(album: Pick<Album, 'id' | 'mintVariants'> | undefined) {
  const [view, setViewState] = useState<AlbumView>(album?.mintVariants ? DEFAULT_ALBUM_VIEW : 'design');

  // Read after mount, so the server render and the first client render agree.
  useEffect(() => {
    if (album) setViewState(readAlbumView(album));
  }, [album]);

  const setView = useCallback(
    (next: AlbumView) => {
      setViewState(next);
      if (!album) return;
      try {
        window.localStorage.setItem(KEY_PREFIX + album.id, next);
      } catch {
        // Not remembered, but still applied.
      }
    },
    [album]
  );

  return [view, setView] as const;
}
