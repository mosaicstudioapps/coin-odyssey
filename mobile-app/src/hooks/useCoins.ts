import { useCallback, useEffect, useState } from 'react';
import { CoinService } from '../services/coinService';
import { Logger } from '../services/logger';
import type { Coin } from '../types/coin';

/** The collection for a screen: loads on mount and reloads after any save. */
export function useCoins() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      setCoins(await CoinService.getUserCoins());
    } catch (err) {
      Logger.warn('Could not load coins', err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
    return CoinService.onCoinsChanged(() => {
      reload();
    });
  }, [reload]);

  return { coins, loaded, reload };
}
