// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoinCategory } from '@coin-collecting/shared';
import { Logger } from './logger';

/**
 * The raw payload we replay through CoinService.createCoin once online.
 * Mirrors CreateCoinData but only the subset we actually queue.
 */
export interface PendingCreateCoinData {
  name: string;
  year: number;
  denomination: string;
  country?: string;
  mintMark?: string;
  category?: CoinCategory;
  grade?: string;
  series?: string;
  seriesId?: string;
  specificCoinId?: string;
  specificCoinName?: string;
  designer?: string;
  faceValue?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
  historicalNotes?: string;
  obverseImage?: string;
  reverseImage?: string;
}

export interface PendingCoin {
  uuid: string;
  queuedAt: number; // ms epoch
  retryCount: number;
  lastError?: string;
  data: PendingCreateCoinData;
}

const STORAGE_KEY = 'offline_pending_coins_v2';

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class OfflineStorage {
  static async queuePendingCoin(data: PendingCreateCoinData): Promise<PendingCoin> {
    const list = await this.getPendingCoins();
    const entry: PendingCoin = {
      uuid: uuid(),
      queuedAt: Date.now(),
      retryCount: 0,
      data,
    };
    list.push(entry);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    Logger.info('Queued pending coin', { uuid: entry.uuid, queueSize: list.length });
    return entry;
  }

  static async getPendingCoins(): Promise<PendingCoin[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PendingCoin[]) : [];
    } catch (err) {
      Logger.error('Failed to read pending coins', err);
      return [];
    }
  }

  static async removePendingCoin(uuid: string): Promise<void> {
    const list = await this.getPendingCoins();
    const next = list.filter((p) => p.uuid !== uuid);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  static async markPendingFailure(uuid: string, error: string): Promise<void> {
    const list = await this.getPendingCoins();
    const next = list.map((p) =>
      p.uuid === uuid ? { ...p, retryCount: p.retryCount + 1, lastError: error } : p
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  static async clearAllPending(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
