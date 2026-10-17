'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Coin } from '@coin-collecting/shared';
import { getUserCoins, onCoinsChanged, subscribeToCoins } from '@/lib/coins';

export type CoinsLoadState = 'loading' | 'error' | 'ready';

/**
 * The signed-in collector's coins, kept fresh: reloads after a save in this
 * tab and on changes from other devices. A failed reload keeps what's shown.
 */
export function useCoins() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [state, setState] = useState<CoinsLoadState>('loading');

  const reload = useCallback(async () => {
    try {
      setCoins(await getUserCoins());
      setState('ready');
    } catch {
      setState(current => (current === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    void reload();
    const offLocal = onCoinsChanged(() => void reload());
    const offLive = subscribeToCoins(() => void reload());
    return () => {
      offLocal();
      offLive();
    };
  }, [reload]);

  return { coins, setCoins, state, reload };
}
