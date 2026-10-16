'use client';

// The web app's coin data: the same table, photo bucket, and rules as the
// mobile app's coinService, built on the shared row mappers and signed-URL
// cache. Row-level security scopes every query to the signed-in user.
import {
  COIN_IMAGES_BUCKET,
  coinFromRow,
  coinToRow,
  createSignedUrlCache,
  isStoragePath,
  type Coin,
  type CoinFormFields,
} from '@coin-collecting/shared';
import { supabase } from '@/lib/supabase';

/** Fields a save can write on top of the form's (a scan adds these). */
export type CoinWrite = Partial<CoinFormFields> &
  Partial<Pick<Coin, 'historicalNotes' | 'conditionNotes' | 'composition' | 'seriesId' | 'specificCoinId' | 'specificCoinName'>>;

export interface PhotoChanges {
  /** A prepared JPEG to upload, or undefined to leave the side as it is. */
  obverse?: Blob;
  reverse?: Blob;
}

const images = createSignedUrlCache(async (paths, ttlSeconds) => {
  const { data, error } = await supabase.storage.from(COIN_IMAGES_BUCKET).createSignedUrls(paths, ttlSeconds);
  if (error) {
    console.error('Could not sign photo URLs', error.message);
    return null;
  }
  return data ?? [];
});

// ---- change notifications (achievements re-check after every save)
const listeners = new Set<() => void>();

export function onCoinsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyCoinsChanged() {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.warn('Coin change listener failed', err);
    }
  });
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You must be signed in to do that.');
  return data.user.id;
}

/** The user's one collection, created on first use (the mobile app does the same). */
async function getOrCreateCollectionId(userId: string): Promise<string> {
  const { data: existing, error } = await supabase.from('collections').select('id').eq('user_id', userId).limit(1);
  if (error) throw new Error('Unable to access your collection. Please try again.');
  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error: createError } = await supabase
    .from('collections')
    .insert({ user_id: userId, name: 'My Coin Collection', description: 'My personal coin collection' })
    .select('id')
    .single();
  if (createError || !created) throw new Error('Unable to create your collection. Please try again.');
  return created.id;
}

/** Upload one side's photo into the user's folder. Returns its storage path. */
async function uploadPhoto(photo: Blob, userId: string, coinId: string, side: 'obverse' | 'reverse'): Promise<string> {
  const path = `${userId}/${coinId}_${side}_${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from(COIN_IMAGES_BUCKET)
    .upload(path, photo, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error('A photo could not be uploaded. Please try again.');
  return data?.path ?? path;
}

async function removePhotos(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(COIN_IMAGES_BUCKET).remove(paths);
  if (error) console.warn('Could not remove replaced photos', error.message);
  images.forget(paths);
}

export async function getUserCoins(): Promise<Coin[]> {
  const { data, error } = await supabase
    .from('coins')
    .select('*, collections!inner(user_id)')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Could not load your collection.');
  return images.resolve((data ?? []).map(coinFromRow));
}

/** One coin with signed photo URLs, or null if it's gone. */
export async function getCoin(coinId: string): Promise<Coin | null> {
  const { data, error } = await supabase.from('coins').select('*').eq('id', coinId).maybeSingle();
  if (error) throw new Error('Could not load this coin.');
  if (!data) return null;
  const [coin] = await images.resolve([coinFromRow(data)]);
  return coin;
}

export async function createCoin(fields: CoinWrite, photos: PhotoChanges = {}): Promise<Coin> {
  const userId = await requireUserId();
  const collectionId = await getOrCreateCollectionId(userId);
  // Same naming as mobile: photos are uploaded before the row exists.
  const tempId = `temp_${Date.now()}`;
  const obversePath = photos.obverse ? await uploadPhoto(photos.obverse, userId, tempId, 'obverse') : null;
  const reversePath = photos.reverse ? await uploadPhoto(photos.reverse, userId, tempId, 'reverse') : null;

  const { data, error } = await supabase
    .from('coins')
    .insert({
      collection_id: collectionId,
      ...coinToRow(fields as Partial<Coin>),
      images: obversePath || reversePath ? [obversePath, reversePath] : null,
    })
    .select('*')
    .single();
  if (error || !data) {
    await removePhotos([obversePath, reversePath].filter((p): p is string => !!p));
    throw new Error('Unable to save your coin. Please try again.');
  }
  const [coin] = await images.resolve([{ ...coinFromRow(data), userId }]);
  notifyCoinsChanged();
  return coin;
}

export async function updateCoin(coinId: string, fields: CoinWrite, photos: PhotoChanges = {}): Promise<Coin> {
  const userId = await requireUserId();
  const { data: current, error: fetchError } = await supabase.from('coins').select('images').eq('id', coinId).single();
  if (fetchError) throw new Error('Could not load this coin.');

  let obversePath: string | null = current?.images?.[0] ?? null;
  let reversePath: string | null = current?.images?.[1] ?? null;
  const replaced: string[] = [];
  if (photos.obverse) {
    const next = await uploadPhoto(photos.obverse, userId, coinId, 'obverse');
    if (isStoragePath(obversePath)) replaced.push(obversePath);
    obversePath = next;
  }
  if (photos.reverse) {
    const next = await uploadPhoto(photos.reverse, userId, coinId, 'reverse');
    if (isStoragePath(reversePath)) replaced.push(reversePath);
    reversePath = next;
  }

  const { data, error } = await supabase
    .from('coins')
    .update({
      ...coinToRow(fields as Partial<Coin>),
      images: obversePath || reversePath ? [obversePath, reversePath] : [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', coinId)
    .select('*')
    .single();
  if (error || !data) throw new Error('Unable to save your changes. Please try again.');

  // Only once the row points at the new photos are the old ones removed.
  await removePhotos(replaced);
  const [coin] = await images.resolve([{ ...coinFromRow(data), userId }]);
  notifyCoinsChanged();
  return coin;
}

export async function deleteCoin(coinId: string): Promise<void> {
  const { data: existing } = await supabase.from('coins').select('images').eq('id', coinId).single();
  const { error } = await supabase.from('coins').delete().eq('id', coinId);
  if (error) throw new Error('Could not delete this coin. Please try again.');
  const paths = ((existing?.images ?? []) as (string | null)[]).filter((p): p is string => isStoragePath(p));
  await removePhotos(paths);
  notifyCoinsChanged();
}

/**
 * Live updates: refresh when coins change on another device or tab. Row-level
 * security scopes the stream to this user's coins. Returns an unsubscribe.
 */
export function subscribeToCoins(onChange: () => void): () => void {
  const channel = supabase
    .channel(`coins-web-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'coins' }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
