// src/services/__tests__/offlineStorage.test.ts
//
// Coins queued offline keep their photos outside the cache until they sync.

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => void mockStore.set(key, value)),
  removeItem: jest.fn(async (key: string) => void mockStore.delete(key)),
}));

const mockFiles = new Set<string>();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    if (from.includes('broken')) throw new Error('copy failed');
    mockFiles.add(to);
  }),
  deleteAsync: jest.fn(async (uri: string) => void mockFiles.delete(uri)),
}));

import { OfflineStorage, PENDING_PHOTO_DIR } from '../storage';

const base = { name: '1964 Quarter', year: 1964, denomination: 'Quarter' };

beforeEach(() => {
  mockStore.clear();
  mockFiles.clear();
});

describe('offline photo queue', () => {
  it('copies cache photos to the lasting folder when a coin is queued', async () => {
    const entry = await OfflineStorage.queuePendingCoin({
      ...base,
      obverseImage: 'file:///cache/ImageManipulator/a.jpg',
      reverseImage: 'file:///cache/ImageManipulator/b.jpg',
    });
    expect(entry.data.obverseImage).toBe(`${PENDING_PHOTO_DIR}${entry.uuid}_obverse.jpg`);
    expect(entry.data.reverseImage).toBe(`${PENDING_PHOTO_DIR}${entry.uuid}_reverse.jpg`);
    expect(mockFiles.size).toBe(2);
  });

  it('still queues the coin if a copy fails, keeping the original path', async () => {
    const entry = await OfflineStorage.queuePendingCoin({ ...base, obverseImage: 'file:///cache/broken.jpg' });
    expect(entry.data.obverseImage).toBe('file:///cache/broken.jpg');
    expect(await OfflineStorage.getPendingCoins()).toHaveLength(1);
  });

  it('deletes kept photos once the coin syncs', async () => {
    const entry = await OfflineStorage.queuePendingCoin({ ...base, obverseImage: 'file:///cache/a.jpg' });
    await OfflineStorage.removePendingCoin(entry.uuid);
    expect(mockFiles.size).toBe(0);
    expect(await OfflineStorage.getPendingCoins()).toHaveLength(0);
  });

  it('keeps photos a re-queued copy of the coin still points at', async () => {
    const first = await OfflineStorage.queuePendingCoin({ ...base, obverseImage: 'file:///cache/a.jpg' });
    // A sync that loses the network re-queues the same data before removing the original.
    const second = await OfflineStorage.queuePendingCoin(first.data);
    expect(second.data.obverseImage).toBe(first.data.obverseImage);
    await OfflineStorage.removePendingCoin(first.uuid);
    expect(mockFiles.has(first.data.obverseImage!)).toBe(true);
  });
});
