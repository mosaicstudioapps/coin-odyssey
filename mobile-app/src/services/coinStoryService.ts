import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { CoinService } from './coinService';
import { Coin } from '../types/coin';
import { Logger } from './logger';
import {
  StoryError,
  hasEnoughStoryDetail,
  storyInputFromCoin,
  storyRequestBody,
  type CoinStoryInput,
  type StoryAPIResponse,
} from '@coin-collecting/shared';

/**
 * "About this coin" for coins that were never scanned.
 *
 * Scanning gets this text for free — `recognize-coin` returns a `history`
 * paragraph alongside the identification. A coin typed in by hand has no such
 * call behind it, so it needs the text-only `coin-story` function instead.
 */

// Story rules and types live in packages/shared; re-exported for existing imports.
export { StoryError } from '@coin-collecting/shared';
export type { CoinStoryInput, StoryErrorCode } from '@coin-collecting/shared';

export class CoinStoryService {
  /**
   * Whether a coin has enough recorded detail for the story to be worth asking
   * for. Mirrors the server's guard so an obviously hopeless request never
   * leaves the phone.
   */
  static hasEnoughDetail(input: CoinStoryInput): boolean {
    return hasEnoughStoryDetail(input);
  }

  static fromCoin(coin: Coin): CoinStoryInput {
    return storyInputFromCoin(coin);
  }

  /** Ask the edge function for a background note. Returns null if it declined. */
  static async fetchStory(input: CoinStoryInput): Promise<string | null> {
    if (!this.hasEnoughDetail(input)) {
      throw new StoryError(
        'Add at least a year and denomination first.',
        'insufficient_detail'
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new StoryError('Please sign in first.', 'auth');
    }

    const { data, error } = await supabase.functions.invoke('coin-story', {
      body: storyRequestBody(input),
    });

    if (error) {
      // supabase-js leaves a non-2xx body unread; read it so the real reason
      // reaches the logs instead of a generic "unavailable".
      let status: number | undefined;
      let serverMessage: string | undefined;

      if (error instanceof FunctionsHttpError) {
        status = error.context?.status;
        try {
          const payload = await error.context.json();
          serverMessage = payload?.error;
          Logger.error('Story function returned an error', { status, payload });
        } catch {
          Logger.error('Story function returned an unreadable error', { status });
        }
      } else {
        Logger.error('Coin story edge function error', error);
      }

      if (status === 401) {
        throw new StoryError('Your session has expired. Please sign in again.', 'auth');
      }
      throw new StoryError(
        serverMessage ?? 'Could not reach the story service. Please try again.',
        'service_unavailable'
      );
    }

    const response = data as StoryAPIResponse;
    if (!response.success) {
      throw new StoryError(
        response.error ?? 'Could not write a story for this coin.',
        response.code ?? 'unknown'
      );
    }

    return response.result?.history ?? null;
  }

  /**
   * Fetch a story and save it onto the coin. Returns the text, or null when the
   * model declined to write one (too little detail to say anything true).
   */
  static async generateAndSave(coin: Coin): Promise<string | null> {
    const history = await this.fetchStory(this.fromCoin(coin));
    if (!history) return null;

    await CoinService.updateCoin(coin.id, { historicalNotes: history });
    Logger.info('Coin story saved', { coinId: coin.id });
    return history;
  }

  /**
   * Best-effort background fill used right after a manual save: by the time the
   * collector opens the coin, the story is usually already there. Never throws
   * and never blocks the save — the detail screen offers a manual retry.
   */
  static backfillInBackground(coin: Coin): void {
    // Offline-queued coins have no server row to update yet; the id is a local
    // placeholder. Skip them — the detail screen can fill it in after sync.
    if (!coin.id || coin.id.startsWith('offline-')) return;
    if (coin.historicalNotes) return;
    if (!this.hasEnoughDetail(this.fromCoin(coin))) return;

    void this.generateAndSave(coin).catch((err) => {
      Logger.warn('Background coin story failed (non-fatal)', {
        coinId: coin.id,
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }
}
