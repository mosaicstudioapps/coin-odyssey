'use client';

// The want list on the web: the want_list table through the signed-in
// session (row-level security keeps it to the collector's own rows), with the
// shared rules for what's still wanted (packages/shared, wantList.ts).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { wantKey, type WantEntry } from '@coin-collecting/shared';
import { supabase } from '@/lib/supabase';

async function loadWants(): Promise<WantEntry[]> {
  const { data, error } = await supabase.from('want_list').select('album_id, slot_id, created_at');
  if (error) throw new Error('Could not load your want list.');
  return (data ?? []).map(row => ({ albumId: row.album_id, slotId: row.slot_id, createdAt: row.created_at }));
}

// Every page using the hook hears about changes made on another.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export function useWantList() {
  const [entries, setEntries] = useState<WantEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setEntries(await loadWants());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your want list.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const listener = () => void reload();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [reload]);

  const keys = useMemo(() => new Set(entries.map(e => wantKey(e.albumId, e.slotId))), [entries]);
  const isWanted = useCallback((albumId: string, slotId: string) => keys.has(wantKey(albumId, slotId)), [keys]);

  /** Add or remove a want; the screen updates at once and rolls back if the save fails. */
  const toggle = useCallback(
    async (albumId: string, slotId: string) => {
      const wanted = keys.has(wantKey(albumId, slotId));
      const before = entries;
      setEntries(wanted ? entries.filter(e => wantKey(e.albumId, e.slotId) !== wantKey(albumId, slotId)) : [...entries, { albumId, slotId }]);
      const { data } = await supabase.auth.getUser();
      const query = wanted
        ? supabase.from('want_list').delete().eq('album_id', albumId).eq('slot_id', slotId)
        : supabase.from('want_list').insert({ user_id: data.user?.id, album_id: albumId, slot_id: slotId });
      const { error: saveError } = await query;
      if (saveError) {
        setEntries(before);
        setError(wanted ? 'Could not remove it from your want list.' : 'Could not add it to your want list.');
        return;
      }
      setError(null);
      notify();
    },
    [entries, keys]
  );

  return { entries, loaded, error, isWanted, toggle, reload };
}
