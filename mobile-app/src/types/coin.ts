import { Coin as SharedCoin } from '@coin-collecting/shared';

/** The shared coin, plus the one field only the mobile offline queue sets. */
export interface Coin extends SharedCoin {
  /** True when this coin has been queued in offline storage and is waiting to sync. */
  offlinePending?: boolean;
}

// Re-export everything else from shared
export { CoinValueHistory, SearchField, GradeFilter, ValueFilter } from '@coin-collecting/shared';
