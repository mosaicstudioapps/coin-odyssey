// src/services/coinService.ts
import { supabase } from './supabase';
import { Coin } from '../types/coin';
import { Logger } from './logger';
import { ErrorService } from './errorService';
import { OfflineStorage, PendingCoin, PendingCreateCoinData } from './storage';
import { OfflineSyncService } from './offlineSyncService';

interface CreateCoinData {
  name: string;
  title?: string;
  year: number;
  denomination: string;
  country?: string;
  mintMark?: string;
  grade?: string;
  faceValue?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
  historicalNotes?: string;
  obverseImage?: string;
  reverseImage?: string;
  // Series information
  series?: string;
  seriesId?: string;
  specificCoinId?: string;
  specificCoinName?: string;
  designer?: string;
  theme?: string;
  honoree?: string;
  releaseDate?: string;
  certificationNumber?: string;
  gradingService?: string;
}

/**
 * Service for managing coin-related operations
 * Handles CRUD operations, image uploads, and collection management
 *
 * Images live in the private `coin-images` bucket under `{userId}/...`.
 * The database stores bucket paths; rendering goes through short-lived
 * signed URLs resolved by `resolveImageUrls`.
 */
export class CoinService {
  /** Signed image URLs stay valid this long; cached and re-signed on expiry. */
  private static readonly SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

  private static signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

  /**
   * A bucket path like "userId/coin_obverse_123.jpg" — as opposed to a full
   * URL (legacy rows) or a local file:// URI (pending offline coins), which
   * must pass through untouched.
   */
  private static isStoragePath(value: string | null | undefined): value is string {
    return !!value && !value.includes('://');
  }

  /**
   * Swap stored bucket paths in obverseImage/reverseImage for signed URLs the
   * <Image> components can load. One batched storage call per invocation;
   * results are cached until shortly before they expire. Paths that fail to
   * sign resolve to null so the UI falls back to its placeholder.
   */
  static async resolveImageUrls(coins: Coin[]): Promise<Coin[]> {
    const now = Date.now();
    const pathsToSign = new Set<string>();

    for (const coin of coins) {
      for (const value of [coin.obverseImage, coin.reverseImage]) {
        if (this.isStoragePath(value)) {
          const cached = this.signedUrlCache.get(value);
          if (!cached || cached.expiresAt <= now) pathsToSign.add(value);
        }
      }
    }

    if (pathsToSign.size > 0) {
      const { data, error } = await supabase.storage
        .from('coin-images')
        .createSignedUrls([...pathsToSign], this.SIGNED_URL_TTL_SECONDS);

      if (error) {
        Logger.error('Failed to create signed image URLs', { error: error.message });
      } else {
        // Refresh a minute early so an in-flight render never gets a dead URL.
        const expiresAt = now + (this.SIGNED_URL_TTL_SECONDS - 60) * 1000;
        for (const entry of data ?? []) {
          if (entry.path && entry.signedUrl) {
            this.signedUrlCache.set(entry.path, { url: entry.signedUrl, expiresAt });
          }
        }
      }
    }

    return coins.map((coin) => {
      const resolve = (value: string | null | undefined) =>
        this.isStoragePath(value) ? this.signedUrlCache.get(value)?.url ?? null : value ?? null;
      return {
        ...coin,
        obverseImage: resolve(coin.obverseImage),
        reverseImage: resolve(coin.reverseImage),
      };
    });
  }

  /**
   * Map raw Supabase row (snake_case) to Coin interface (camelCase)
   */
  static mapSupabaseToCoin(data: any): Coin {
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
      images: data.images ?? null,
      obverseImage: data.images?.[0] ?? null,
      reverseImage: data.images?.[1] ?? null,
      country: data.country ?? null,
      series: data.series ?? null,
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
   * Map Coin interface (camelCase) to Supabase row (snake_case)
   * Only includes fields that are explicitly present (not undefined)
   */
  static mapCoinToSupabase(coin: Partial<Coin>): Record<string, any> {
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
    if (coin.historicalNotes !== undefined) result.historical_notes = coin.historicalNotes || null;
    if (coin.country !== undefined) result.country = coin.country || null;
    if (coin.series !== undefined) result.series = coin.series || null;
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
   * Get or create a default collection for a user
   * If the user already has collections, returns the first one.
   * Otherwise, creates a new default collection.
   *
   * @param userId - The unique identifier for the user
   * @returns Promise<string> - The collection ID
   * @throws Error if unable to fetch or create collection
   *
   * @example
   * const collectionId = await CoinService.getOrCreateDefaultCollection(user.id);
   */
  static async getOrCreateDefaultCollection(userId: string): Promise<string> {
    try {
      // First, check if user has a default collection
      const { data: existingCollections, error: fetchError } = await supabase
        .from('collections')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (fetchError) {
        Logger.error('Failed to fetch collections', fetchError);
        throw new Error('Unable to access your collections. Please try again.');
      }

      // If user has collections, use the first one
      if (existingCollections && existingCollections.length > 0) {
        return existingCollections[0].id;
      }

      // Create default collection if none exists
      const { data: newCollection, error: createError } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          name: 'My Coin Collection',
          description: 'My personal coin collection'
        })
        .select('id')
        .single();

      if (createError) {
        Logger.error('Failed to create collection', createError);
        throw new Error('Unable to create your collection. Please try again.');
      }

      return newCollection.id;
    } catch (error) {
      Logger.error('Error in getOrCreateDefaultCollection', error);
      throw error;
    }
  }

  /**
   * Upload a coin image to Supabase storage
   * Converts the image URI to a blob and uploads into the caller's own folder
   * in the private coin-images bucket (storage RLS only permits `{userId}/...`).
   *
   * @param imageUri - Local URI of the image to upload
   * @param userId - Owner of the image; becomes the top-level folder
   * @param coinId - Unique identifier for the coin (used in filename)
   * @param side - Which side of the coin ('obverse' or 'reverse')
   * @returns Promise<string | null> - Bucket path of the uploaded image, or null on error
   *
   * @example
   * const imagePath = await CoinService.uploadImage(
   *   'file:///path/to/image.jpg',
   *   user.id,
   *   'coin-123',
   *   'obverse'
   * );
   */
  static async uploadImage(
    imageUri: string,
    userId: string,
    coinId: string,
    side: 'obverse' | 'reverse'
  ): Promise<string | null> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create file name
      const fileName = `${coinId}_${side}_${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('coin-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        Logger.error('Image upload failed', { error: error.message });
        return null;
      }

      return data?.path ?? filePath;
    } catch (error) {
      Logger.error('Error uploading image', error);
      return null;
    }
  }

  /**
   * Create a new coin in the user's collection
   * Handles authentication, collection creation, image uploads, and database insertion
   *
   * @param coinData - The coin data to create
   * @returns Promise<Coin> - The created coin with all fields populated
   * @throws Error if user not authenticated or unable to save coin
   *
   * @example
   * const newCoin = await CoinService.createCoin({
   *   name: 'Morgan Dollar',
   *   year: 1921,
   *   denomination: 'Dollar',
   *   purchasePrice: 45.00,
   * });
   */
  /**
   * Build a synthesized Coin object from a queued PendingCoin so callers can render
   * it immediately while it waits to sync.
   */
  static pendingToCoin(entry: PendingCoin): Coin {
    const d = entry.data;
    return {
      id: `offline-${entry.uuid}`,
      name: d.name,
      title: '',
      year: d.year,
      mintMark: d.mintMark ?? null,
      grade: d.grade ?? null,
      faceValue: d.faceValue ?? null,
      purchasePrice: d.purchasePrice ?? null,
      currentMarketValue: null,
      lastValueUpdate: null,
      pcgsId: null,
      createdAt: new Date(entry.queuedAt).toISOString(),
      updatedAt: new Date(entry.queuedAt).toISOString(),
      userId: '',
      collectionId: '',
      denomination: d.denomination,
      purchaseDate: d.purchaseDate ?? null,
      personalValue: null,
      lastAppraisalValue: null,
      lastAppraisalDate: null,
      mintage: null,
      rarityScale: null,
      historicalNotes: d.historicalNotes ?? null,
      varietyNotes: null,
      notes: d.notes ?? null,
      images: null,
      obverseImage: d.obverseImage ?? null,
      reverseImage: d.reverseImage ?? null,
      country: d.country ?? null,
      series: d.series ?? null,
      seriesId: d.seriesId ?? null,
      specificCoinId: d.specificCoinId ?? null,
      specificCoinName: d.specificCoinName ?? null,
      designer: d.designer ?? null,
      theme: null,
      honoree: null,
      releaseDate: null,
      certificationNumber: null,
      gradingService: null,
      offlinePending: true,
    };
  }

  static async createCoin(coinData: CreateCoinData): Promise<Coin> {
    // Pre-flight offline check. If we already know we're offline, queue without
    // burning a doomed network round-trip.
    const online = await OfflineSyncService.isOnline();
    if (!online) {
      Logger.info('Offline — queueing coin for later sync', { name: coinData.name });
      const entry = await OfflineStorage.queuePendingCoin(coinData as PendingCreateCoinData);
      await OfflineSyncService.refreshPendingCount();
      return this.pendingToCoin(entry);
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Logger.error('User not authenticated', userError);
        throw new Error('You must be signed in to add coins to your collection.');
      }

      // Get or create default collection
      const collectionId = await this.getOrCreateDefaultCollection(user.id);

      // Generate temporary coin ID for image upload
      const tempCoinId = `temp_${Date.now()}`;

      // Upload images if provided
      let obverseImagePath = null;
      let reverseImagePath = null;

      if (coinData.obverseImage) {
        obverseImagePath = await this.uploadImage(coinData.obverseImage, user.id, tempCoinId, 'obverse');
      }

      if (coinData.reverseImage) {
        reverseImagePath = await this.uploadImage(coinData.reverseImage, user.id, tempCoinId, 'reverse');
      }

      // Prepare coin data for database using centralized mapping
      const dbCoinData = {
        collection_id: collectionId,
        ...this.mapCoinToSupabase(coinData as unknown as Partial<Coin>),
        // Override images with uploaded bucket paths (preserve positions)
        images: (obverseImagePath || reverseImagePath) ? [obverseImagePath, reverseImagePath] : null,
      };

      // Insert coin into database
      const { data: newCoin, error: insertError } = await supabase
        .from('coins')
        .insert(dbCoinData)
        .select('*')
        .single();

      if (insertError) {
        Logger.error('Failed to insert coin into database', insertError);
        throw new Error('Unable to save your coin. Please check your connection and try again.');
      }

      const coin = this.mapSupabaseToCoin(newCoin);
      coin.userId = user.id;
      const [resolved] = await this.resolveImageUrls([coin]);

      return resolved;
    } catch (error) {
      // If this looks like a transient connectivity failure, queue it and return a
      // synthesized coin. The user keeps their work; the queue will flush on reconnect.
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      const looksLikeNetwork =
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('connection') ||
        msg.includes('timeout');
      if (looksLikeNetwork) {
        Logger.warn('Network failure during createCoin — queueing for later sync', { msg });
        const entry = await OfflineStorage.queuePendingCoin(coinData as PendingCreateCoinData);
        await OfflineSyncService.refreshPendingCount();
        return this.pendingToCoin(entry);
      }
      Logger.error('Failed to create coin', error);
      throw error;
    }
  }

  /**
   * Retrieve all coins belonging to the authenticated user
   * Returns coins ordered by creation date (newest first)
   *
   * @returns Promise<Coin[]> - Array of user's coins
   * @throws Error if unable to fetch coins
   *
   * @example
   * const coins = await CoinService.getUserCoins();
   * console.log(`You have ${coins.length} coins`);
   */
  static async getUserCoins(): Promise<Coin[]> {
    const { data: coins, error } = await supabase
      .from('coins')
      .select(`
        *,
        collections!inner(user_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch coins: ${error.message}`);
    }

    return this.resolveImageUrls(coins.map(this.mapSupabaseToCoin));
  }

  /**
   * Update an existing coin's information
   * Handles partial updates - only provided fields are updated
   * Can upload new images if provided
   *
   * @param coinId - The unique identifier of the coin to update
   * @param updates - Partial coin data with fields to update
   * @returns Promise<Coin> - The updated coin
   * @throws Error if user not authenticated or unable to update coin
   *
   * @example
   * const updatedCoin = await CoinService.updateCoin('coin-123', {
   *   grade: 'MS-65',
   *   purchasePrice: 50.00,
   * });
   */
  static async updateCoin(coinId: string, updates: Partial<CreateCoinData>): Promise<Coin> {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get current coin data
    const { data: currentCoin, error: fetchError } = await supabase
      .from('coins')
      .select('*')
      .eq('id', coinId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch coin: ${fetchError.message}`);
    }

    // Handle image uploads if new images provided; remember replaced paths so
    // the old storage objects can be removed once the row update succeeds.
    let obverseImagePath = currentCoin.images?.[0] || null;
    let reverseImagePath = currentCoin.images?.[1] || null;
    const replacedPaths: string[] = [];

    if (updates.obverseImage) {
      const newObversePath = await this.uploadImage(updates.obverseImage, user.id, coinId, 'obverse');
      if (newObversePath) {
        if (this.isStoragePath(obverseImagePath)) replacedPaths.push(obverseImagePath);
        obverseImagePath = newObversePath;
      }
    }

    if (updates.reverseImage) {
      const newReversePath = await this.uploadImage(updates.reverseImage, user.id, coinId, 'reverse');
      if (newReversePath) {
        if (this.isStoragePath(reverseImagePath)) replacedPaths.push(reverseImagePath);
        reverseImagePath = newReversePath;
      }
    }

    // Prepare update data using centralized mapping
    const updateData: Record<string, any> = {
      ...this.mapCoinToSupabase(updates as unknown as Partial<Coin>),
      images: (obverseImagePath || reverseImagePath) ? [obverseImagePath, reverseImagePath] : [],
      updated_at: new Date().toISOString(),
    };

    // Update coin in database
    const { data: updatedCoin, error: updateError } = await supabase
      .from('coins')
      .update(updateData)
      .eq('id', coinId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to update coin: ${updateError.message}`);
    }

    // Best-effort cleanup of the storage objects this update replaced.
    if (replacedPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from('coin-images')
        .remove(replacedPaths);
      if (removeError) {
        Logger.warn('Failed to remove replaced coin images', { error: removeError.message });
      }
      for (const path of replacedPaths) this.signedUrlCache.delete(path);
    }

    const coin = this.mapSupabaseToCoin(updatedCoin);
    coin.userId = user.id;
    const [resolved] = await this.resolveImageUrls([coin]);

    return resolved;
  }

  /**
   * Delete a coin from the database
   * This operation is permanent and cannot be undone
   *
   * @param coinId - The unique identifier of the coin to delete
   * @returns Promise<void>
   * @throws Error if unable to delete coin
   *
   * @example
   * await CoinService.deleteCoin('coin-123');
   */
  static async deleteCoin(coinId: string): Promise<void> {
    // Capture image paths before the row disappears so the storage objects
    // can be cleaned up too.
    const { data: existing } = await supabase
      .from('coins')
      .select('images')
      .eq('id', coinId)
      .single();

    const { error } = await supabase
      .from('coins')
      .delete()
      .eq('id', coinId);

    if (error) {
      throw new Error(`Failed to delete coin: ${error.message}`);
    }

    const paths = ((existing?.images ?? []) as string[]).filter((value) =>
      this.isStoragePath(value)
    );
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from('coin-images')
        .remove(paths);
      if (removeError) {
        Logger.warn('Failed to remove coin images from storage', { error: removeError.message });
      }
      for (const path of paths) this.signedUrlCache.delete(path);
    }
  }

  /**
   * Subscribe to realtime changes on the coins table for a user.
   * Returns an unsubscribe function. The listener receives the raw postgres_changes payload
   * (event: INSERT/UPDATE/DELETE) plus a mapped Coin for convenience.
   */
  static subscribeToCoins(
    userId: string,
    listener: (payload: {
      event: 'INSERT' | 'UPDATE' | 'DELETE';
      coin: Coin | null;
      oldCoin: Coin | null;
    }) => void
  ): () => void {
    // Note: the coins table is scoped via collection_id -> collections.user_id, so we cannot
    // use a postgres_changes filter on user_id here. RLS on the table restricts the rows the
    // current user can see, which is what scopes realtime events for us.
    const channel = supabase
      .channel(`coins_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coins',
        },
        (payload) => {
          void (async () => {
            try {
              const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
              const mapped = payload.new ? this.mapSupabaseToCoin(payload.new) : null;
              const oldCoin = payload.old ? this.mapSupabaseToCoin(payload.old) : null;
              // Image columns hold bucket paths; sign them so listeners get
              // renderable URLs (cache makes this a no-op most of the time).
              const coin = mapped ? (await this.resolveImageUrls([mapped]))[0] : null;
              listener({ event: eventType, coin, oldCoin });
            } catch (err) {
              Logger.error('Realtime payload mapping failed', err);
            }
          })();
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (err) {
        Logger.error('Failed to unsubscribe coins channel', err);
      }
    };
  }
}