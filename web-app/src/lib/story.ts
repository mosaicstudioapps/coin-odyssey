'use client';

// "About this coin" for coins added by hand, from the coin-story edge
// function. Same request and rules as the mobile app (packages/shared,
// storyRules.ts). Scans get their story from recognize-coin instead.
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  StoryError,
  hasEnoughStoryDetail,
  storyInputFromCoin,
  storyRequestBody,
  type Coin,
  type CoinStoryInput,
  type StoryAPIResponse,
} from '@coin-collecting/shared';
import { supabase } from '@/lib/supabase';
import { updateCoin } from '@/lib/coins';

export async function fetchStory(input: CoinStoryInput): Promise<string | null> {
  if (!hasEnoughStoryDetail(input)) {
    throw new StoryError('Add at least a year and denomination first.', 'insufficient_detail');
  }
  const { data, error } = await supabase.functions.invoke('coin-story', { body: storyRequestBody(input) });
  if (error) {
    let status: number | undefined;
    let serverMessage: string | undefined;
    if (error instanceof FunctionsHttpError) {
      status = error.context?.status;
      try {
        serverMessage = (await error.context.json())?.error;
      } catch {
        // Unreadable body: fall through to the generic message.
      }
    }
    if (status === 401) throw new StoryError('Your session has expired. Please sign in again.', 'auth');
    throw new StoryError(serverMessage ?? 'Could not reach the story service. Please try again.', 'service_unavailable');
  }
  const response = data as StoryAPIResponse;
  if (!response.success) {
    throw new StoryError(response.error ?? 'Could not write a story for this coin.', response.code ?? 'unknown');
  }
  return response.result?.history ?? null;
}

/** Write the story and save it onto the coin. Null when the model declined. */
export async function generateAndSaveStory(coin: Coin): Promise<string | null> {
  const history = await fetchStory(storyInputFromCoin(coin));
  if (!history) return null;
  await updateCoin(coin.id, { historicalNotes: history });
  return history;
}

/**
 * After a hand-added coin is saved, fetch its story in the background, so a
 * slow or failed request never stands between the collector and their coin.
 */
export function backfillStoryInBackground(coin: Coin): void {
  if (coin.historicalNotes) return;
  if (!hasEnoughStoryDetail(storyInputFromCoin(coin))) return;
  void generateAndSaveStory(coin).catch(err => {
    console.warn('Background coin story failed', err instanceof Error ? err.message : err);
  });
}
