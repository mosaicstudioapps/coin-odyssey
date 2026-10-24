// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { CoinCategory, CoinSource } from '@coin-collecting/shared';
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
  source?: CoinSource;
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
  conditionNotes?: string;
  composition?: string;
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

/**
 * Where a queued coin's photos wait for sync. Captures land in the cache
 * directory, which the OS may clear whenever space runs low, so a coin queued
 * offline could reach the server with no photos. The documents directory is
 * kept until the app removes the files.
 */
export const PENDING_PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}pending-photos/`;

/**
 * Copy a captured photo somewhere the OS won't clear. Returns the new path, or
 * the original if it isn't a local file, is already kept, or the copy fails
 * (a coin queued with a cache photo still beats a coin not queued at all).
 */
async function keepPhoto(uri: string | undefined, entryId: string, side: 'obverse' | 'reverse'): Promise<string | undefined> {
  if (!uri || !uri.startsWith('file://') || !FileSystem.documentDirectory || uri.startsWith(PENDING_PHOTO_DIR)) return uri;
  const target = `${PENDING_PHOTO_DIR}${entryId}_${side}.jpg`;
  try {
    await FileSystem.makeDirectoryAsync(PENDING_PHOTO_DIR, { intermediates: true });
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch (err) {
    Logger.warn('Could not keep a queued photo; leaving it in the cache', { side, err });
    return uri;
  }
}

/**
 * Delete a queued coin's kept photos, unless another queued coin still points
 * at them: a sync that loses the network partway re-queues the same coin (and
 * the same photos) before the original entry is removed. Missing files are fine.
 */
async function removeKeptPhotos(entry: PendingCoin, stillQueued: PendingCoin[]): Promise<void> {
  const inUse = new Set(stillQueued.flatMap((p) => [p.data.obverseImage, p.data.reverseImage]));
  for (const uri of [entry.data.obverseImage, entry.data.reverseImage]) {
    if (!uri || !uri.startsWith(PENDING_PHOTO_DIR) || inUse.has(uri)) continue;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (err) {
      Logger.warn('Could not delete a synced photo', err);
    }
  }
}

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class OfflineStorage {
  static async queuePendingCoin(data: PendingCreateCoinData): Promise<PendingCoin> {
    const list = await this.getPendingCoins();
    const id = uuid();
    const entry: PendingCoin = {
      uuid: id,
      queuedAt: Date.now(),
      retryCount: 0,
      data: {
        ...data,
        obverseImage: await keepPhoto(data.obverseImage, id, 'obverse'),
        reverseImage: await keepPhoto(data.reverseImage, id, 'reverse'),
      },
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

  /** Drop a synced coin from the queue, and its kept photos with it. */
  static async removePendingCoin(uuid: string): Promise<void> {
    const list = await this.getPendingCoins();
    const removed = list.find((p) => p.uuid === uuid);
    const next = list.filter((p) => p.uuid !== uuid);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (removed) await removeKeptPhotos(removed, next);
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
    try {
      if (FileSystem.documentDirectory) await FileSystem.deleteAsync(PENDING_PHOTO_DIR, { idempotent: true });
    } catch (err) {
      Logger.warn('Could not clear queued photos', err);
    }
  }
}
