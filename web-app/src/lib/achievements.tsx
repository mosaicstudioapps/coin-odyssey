'use client';

// Achievements on the web: the shared rules (packages/shared,
// achievementSync.ts) over the same user_achievements table as mobile, with
// the "first check done" flag in localStorage. Checks after every save, keeps
// the latest result for the dashboard card and the Achievements page, and
// celebrates each badge a check unlocks. The first check in a browser is
// quiet, so signing in on the web doesn't replay badges earned on the phone.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ACHIEVEMENT_TIER_LABELS,
  createAchievementChecker,
  type AchievementDefinition,
  type AchievementSeedFlag,
  type AchievementSnapshot,
  type AchievementUnlockStore,
  type AchievementUser,
} from '@coin-collecting/shared';
import { AchievementBadge, CoButton, Eyebrow } from '@/components/co';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { getUserCoins, onCoinsChanged } from '@/lib/coins';

const SEEDED_KEY_PREFIX = 'co-achievements-seeded-v1:';
/** Long enough that a save followed by an edit runs one check, not two. */
const CHECK_DELAY_MS = 800;

const unlocks: AchievementUnlockStore = {
  async load(userId) {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId)
      .eq('is_completed', true);
    if (error) {
      console.warn('Could not load achievements', error.message);
      return null;
    }
    const saved = new Map<string, string>();
    for (const row of data ?? []) saved.set(row.achievement_id, row.unlocked_at ?? new Date().toISOString());
    return saved;
  },
  async save(userId, progress) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('user_achievements')
      .upsert(
        progress.map(p => ({
          user_id: userId,
          achievement_id: p.id,
          is_completed: true,
          unlocked_at: now,
          progress: { current: p.current, required: p.required },
        })),
        { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
      )
      .select('achievement_id, unlocked_at');
    if (error) {
      console.warn('Could not save achievements', error.message);
      return [];
    }
    return (data ?? []).map(row => ({ id: row.achievement_id as string, unlockedAt: (row.unlocked_at as string | null) ?? now }));
  },
};

const seedFlag: AchievementSeedFlag = {
  async isSeeded(userId) {
    try {
      return window.localStorage.getItem(SEEDED_KEY_PREFIX + userId) === '1';
    } catch {
      // Unreadable storage: treat as seeded. Worst case is one extra
      // celebration, which beats silently swallowing a real unlock.
      return true;
    }
  },
  async markSeeded(userId) {
    try {
      window.localStorage.setItem(SEEDED_KEY_PREFIX + userId, '1');
    } catch {
      // Private window or blocked storage: the next visit is quiet again.
    }
  },
};

const checker = createAchievementChecker({ unlocks, seedFlag });

interface AchievementsContextValue {
  /** Null until the first check finishes. */
  snapshot: AchievementSnapshot | null;
  refresh: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AchievementUser | null>(null);
  const [snapshot, setSnapshot] = useState<AchievementSnapshot | null>(null);
  const [queue, setQueue] = useState<AchievementDefinition[]>([]);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const next = data.user;
      if (next) setUser(current => (current?.id === next.id ? current : { id: next.id, created_at: next.created_at }));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user;
      setUser(current => (current?.id === next?.id ? current : next ? { id: next.id, created_at: next.created_at } : null));
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    try {
      const result = await checker.check(await getUserCoins(), current);
      // Signed out (or into another account) while the check ran.
      if (userRef.current?.id !== current.id) return;
      setSnapshot(result);
      if (result.newlyUnlocked.length > 0) setQueue(previous => [...previous, ...result.newlyUnlocked]);
    } catch (err) {
      console.warn('Achievements check failed', err);
    }
  }, []);

  useEffect(() => {
    setSnapshot(null);
    setQueue([]);
    if (user) void refresh();
  }, [user, refresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onCoinsChanged(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), CHECK_DELAY_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [refresh]);

  const showing = queue[0];
  const dismiss = useCallback(() => setQueue(previous => previous.slice(1)), []);

  return (
    <AchievementsContext.Provider value={{ snapshot, refresh }}>
      {children}
      <Dialog open={Boolean(showing)} onOpenChange={open => !open && dismiss()}>
        <DialogContent className="max-w-sm border-co-gold-ring bg-co-bg2 px-6 py-7 text-center [&>button]:hidden">
          {showing && (
            <div className="flex flex-col items-center">
              <Eyebrow>Achievement unlocked</Eyebrow>
              <div className="mb-[18px] mt-5">
                <AchievementBadge achievement={showing} earned size={104} />
              </div>
              <DialogTitle className="font-display text-[26px] font-normal tracking-[-0.02em]">{showing.title}</DialogTitle>
              <DialogDescription className="mt-2 text-[14px] leading-5 text-co-fg2">{showing.description}</DialogDescription>
              <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-co-gold-text">
                {ACHIEVEMENT_TIER_LABELS[showing.tier].toUpperCase()}
              </p>
              <CoButton className="mt-6 w-full" onClick={dismiss} autoFocus>
                {queue.length > 1 ? `Next · ${queue.length - 1} more` : 'Nice!'}
              </CoButton>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const value = useContext(AchievementsContext);
  if (!value) throw new Error('useAchievements must be used inside AchievementsProvider');
  return value;
}
