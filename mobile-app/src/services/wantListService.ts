// src/services/wantListService.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { wantKey, type WantEntry } from '@coin-collecting/shared';

import { supabase } from './supabase';
import { Logger } from './logger';

// The want list: album slots the collector is hunting for, in the want_list
// table (row-level security keeps it to their own rows). The shared module
// (packages/shared, wantList.ts) decides what's still wanted and builds the
// text that gets shared. Needs a connection; it isn't queued offline.

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export const WantListService = {
  async load(): Promise<WantEntry[]> {
    const { data, error } = await supabase.from('want_list').select('album_id, slot_id, created_at');
    if (error) {
      Logger.warn('Could not load the want list', { error: error.message });
      throw new Error('Could not load your want list.');
    }
    return (data ?? []).map(row => ({ albumId: row.album_id, slotId: row.slot_id, createdAt: row.created_at }));
  },

  async add(albumId: string, slotId: string): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from('want_list').insert({ user_id: data.user?.id, album_id: albumId, slot_id: slotId });
    if (error) throw new Error('Could not add it to your want list.');
    notify();
  },

  async remove(albumId: string, slotId: string): Promise<void> {
    const { error } = await supabase.from('want_list').delete().eq('album_id', albumId).eq('slot_id', slotId);
    if (error) throw new Error('Could not remove it from your want list.');
    notify();
  },

  onChanged(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** The want list for a screen: loads on mount and stays current across screens. */
export function useWantList() {
  const [entries, setEntries] = useState<WantEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setEntries(await WantListService.load());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your want list.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
    return WantListService.onChanged(() => {
      reload();
    });
  }, [reload]);

  const keys = useMemo(() => new Set(entries.map(e => wantKey(e.albumId, e.slotId))), [entries]);
  const isWanted = useCallback((albumId: string, slotId: string) => keys.has(wantKey(albumId, slotId)), [keys]);

  /** Add or remove a want; the screen updates at once and rolls back if the save fails. */
  const toggle = useCallback(
    async (albumId: string, slotId: string) => {
      const key = wantKey(albumId, slotId);
      const wanted = keys.has(key);
      const before = entries;
      setEntries(wanted ? entries.filter(e => wantKey(e.albumId, e.slotId) !== key) : [...entries, { albumId, slotId }]);
      try {
        await (wanted ? WantListService.remove(albumId, slotId) : WantListService.add(albumId, slotId));
        setError(null);
      } catch (err) {
        setEntries(before);
        setError(err instanceof Error ? err.message : 'Could not update your want list.');
      }
    },
    [entries, keys]
  );

  return { entries, loaded, error, isWanted, toggle, reload };
}
