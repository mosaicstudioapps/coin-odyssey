// Coins as stored in the `coins` table (snake_case) and as the apps use them
// (camelCase), plus the photo-path rules. Shared so mobile and web read and
// write rows identically. Moved verbatim from
// mobile-app/src/services/coinService.ts in Phase 1 of the web plan.
import type { Coin } from '../types/coin';
import { coerceCoinCategory, coerceCoinSource } from '../types/coin';

/** A coins-table row to a Coin. Photos come back as stored paths; resolve them to signed URLs to display. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows arrive untyped from the client
export function coinFromRow(data: any): Coin {
  return {
    id: data.id,
    name: data.name || `${data.year} ${data.denomination}`,
    title: data.title || '',
    year: data.year,
    mintMark: data.mint_mark ?? null,
    grade: data.grade ?? null,
    faceValue: data.face_value ?? null,
    purchasePrice: data.purchase_price ?? null,
    currentMarketValue: data.current_market_value ?? null,
    lastValueUpdate: data.last_value_update ?? null,
    pcgsId: data.pcgs_id ?? null,
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
    userId: data.user_id ?? data.collections?.user_id ?? null,
    collectionId: data.collection_id ?? null,
    denomination: data.denomination,
    purchaseDate: data.purchase_date ?? null,
    personalValue: data.personal_value ?? null,
    lastAppraisalValue: data.last_appraisal_value ?? null,
    lastAppraisalDate: data.last_appraisal_date ?? null,
    mintage: data.mintage ?? null,
    rarityScale: data.rarity_scale ?? null,
    historicalNotes: data.historical_notes ?? null,
    varietyNotes: data.variety_notes ?? null,
    notes: data.notes ?? null,
    conditionNotes: data.condition_notes ?? null,
    images: data.images ?? null,
    obverseImage: data.images?.[0] ?? null,
    reverseImage: data.images?.[1] ?? null,
    country: data.country ?? null,
    series: data.series ?? null,
    category: coerceCoinCategory(data.category),
    source: coerceCoinSource(data.source),
    seriesId: data.series_id ?? null,
    specificCoinId: data.specific_coin_id ?? null,
    specificCoinName: data.specific_coin_name ?? null,
    designer: data.designer ?? null,
    theme: data.theme ?? null,
    honoree: data.honoree ?? null,
    releaseDate: data.release_date ?? null,
    certificationNumber: data.certification_number ?? null,
    gradingService: data.grading_service ?? null,
  };
}

/**
 * The columns to write for a coin or a partial update. Only fields present
 * (not undefined) are included, so an update never blanks what it didn't touch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the client accepts loose rows
export function coinToRow(coin: Partial<Coin>): Record<string, any> {
  const result: Record<string, any> = {};

  if (coin.collectionId !== undefined) result.collection_id = coin.collectionId;
  if (coin.name !== undefined) result.name = coin.name;
  if (coin.title !== undefined) result.title = coin.title || null;
  if (coin.denomination !== undefined) result.denomination = coin.denomination;
  if (coin.year !== undefined) result.year = coin.year;
  if (coin.mintMark !== undefined) result.mint_mark = coin.mintMark || null;
  if (coin.grade !== undefined) result.grade = coin.grade || null;
  if (coin.faceValue !== undefined) result.face_value = coin.faceValue ?? null;
  if (coin.purchasePrice !== undefined) result.purchase_price = coin.purchasePrice ?? null;
  if (coin.currentMarketValue !== undefined) result.current_market_value = coin.currentMarketValue ?? null;
  if (coin.purchaseDate !== undefined) result.purchase_date = coin.purchaseDate || null;
  if (coin.notes !== undefined) result.notes = coin.notes || null;
  if (coin.conditionNotes !== undefined) result.condition_notes = coin.conditionNotes || null;
  if (coin.historicalNotes !== undefined) result.historical_notes = coin.historicalNotes || null;
  if (coin.country !== undefined) result.country = coin.country || null;
  if (coin.series !== undefined) result.series = coin.series || null;
  if (coin.category !== undefined) result.category = coin.category || null;
  if (coin.source !== undefined) result.source = coin.source || null;
  if (coin.seriesId !== undefined) result.series_id = coin.seriesId || null;
  if (coin.specificCoinId !== undefined) result.specific_coin_id = coin.specificCoinId || null;
  if (coin.specificCoinName !== undefined) result.specific_coin_name = coin.specificCoinName || null;
  if (coin.designer !== undefined) result.designer = coin.designer || null;
  if (coin.theme !== undefined) result.theme = coin.theme || null;
  if (coin.honoree !== undefined) result.honoree = coin.honoree || null;
  if (coin.releaseDate !== undefined) result.release_date = coin.releaseDate || null;
  if (coin.certificationNumber !== undefined) result.certification_number = coin.certificationNumber || null;
  if (coin.gradingService !== undefined) result.grading_service = coin.gradingService || null;
  if (coin.images !== undefined) result.images = coin.images || null;

  return result;
}

/**
 * A bucket path like "userId/coin_obverse_123.jpg", as opposed to a full URL
 * (legacy rows) or a local file:// URI (a pending offline coin), which must
 * pass through untouched.
 */
export function isStoragePath(value: string | null | undefined): value is string {
  return !!value && !value.includes('://');
}

/** The private photo bucket, one folder per user id. */
export const COIN_IMAGES_BUCKET = 'coin-images';

/** How long a signed photo URL lives. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

/** Signs many storage paths in one call; each app wraps its own Supabase client. */
export type SignStoragePaths = (
  paths: string[],
  ttlSeconds: number
) => Promise<{ path: string | null; signedUrl: string | null }[] | null>;

/**
 * Swap stored photo paths for signed URLs an <img> or <Image> can load. One
 * batched signing call per use, cached until shortly before expiry. Paths that
 * fail to sign resolve to null, so the UI shows its placeholder.
 */
export function createSignedUrlCache(sign: SignStoragePaths, now: () => number = Date.now) {
  const cache = new Map<string, { url: string; expiresAt: number }>();

  async function resolve<C extends Pick<Coin, 'obverseImage' | 'reverseImage'>>(coins: C[]): Promise<C[]> {
    const t = now();
    const pathsToSign = new Set<string>();
    for (const coin of coins) {
      for (const value of [coin.obverseImage, coin.reverseImage]) {
        if (isStoragePath(value)) {
          const cached = cache.get(value);
          if (!cached || cached.expiresAt <= t) pathsToSign.add(value);
        }
      }
    }

    if (pathsToSign.size > 0) {
      const entries = await sign([...pathsToSign], SIGNED_URL_TTL_SECONDS);
      if (entries) {
        // Refresh a minute early so an in-flight render never gets a dead URL.
        const expiresAt = t + (SIGNED_URL_TTL_SECONDS - 60) * 1000;
        for (const entry of entries) {
          if (entry.path && entry.signedUrl) cache.set(entry.path, { url: entry.signedUrl, expiresAt });
        }
      }
    }

    return coins.map(coin => {
      const pick = (value: string | null | undefined) =>
        isStoragePath(value) ? cache.get(value)?.url ?? null : value ?? null;
      return { ...coin, obverseImage: pick(coin.obverseImage), reverseImage: pick(coin.reverseImage) };
    });
  }

  return {
    resolve,
    /** Forget paths whose objects were replaced or deleted. */
    forget(paths: Iterable<string>) {
      for (const path of paths) cache.delete(path);
    },
  };
}
