// "About this coin" for coins added by hand, which the text-only coin-story
// edge function writes. Scans get their story from recognize-coin instead.
// The request shape and the "is there enough detail" guard are shared so
// mobile and web ask the same way. Moved from
// mobile-app/src/services/coinStoryService.ts in Phase 1 of the web plan.
import type { Coin } from '../types/coin';

export interface CoinStoryInput {
  year?: number | null;
  denomination?: string | null;
  country?: string | null;
  mintMark?: string | null;
  series?: string | null;
  designer?: string | null;
  name?: string | null;
  /**
   * Which specific issue this is within a series — "California", "Maya
   * Angelou". Five state quarters share each year from 1999–2008, so without
   * this the story can only speak to the program in general. Set when a coin is
   * assigned to an album slot, or derivable from what the collector typed.
   */
  specificCoinName?: string | null;
  theme?: string | null;
  honoree?: string | null;
}

export type StoryErrorCode = 'insufficient_detail' | 'rate_limit' | 'service_unavailable' | 'auth' | 'unknown';

export class StoryError extends Error {
  code: StoryErrorCode;
  constructor(message: string, code: StoryErrorCode) {
    super(message);
    this.code = code;
  }
}

export interface StoryAPIResponse {
  success: boolean;
  result?: { history: string | null; confidence: 'high' | 'medium' | 'low' };
  error?: string;
  code?: StoryErrorCode;
}

/**
 * Whether a coin has enough recorded detail for a story to be worth asking
 * for. Mirrors the server's guard so a hopeless request is never sent.
 */
export function hasEnoughStoryDetail(input: CoinStoryInput): boolean {
  const denomination = input.denomination?.trim();
  const series = input.series?.trim();
  const hasYear = typeof input.year === 'number' && input.year > 0;
  return !!denomination && (hasYear || !!series);
}

export function storyInputFromCoin(coin: Coin): CoinStoryInput {
  return {
    year: coin.year,
    denomination: coin.denomination,
    country: coin.country,
    mintMark: coin.mintMark,
    series: coin.series,
    designer: coin.designer,
    name: coin.name,
    specificCoinName: coin.specificCoinName,
    theme: coin.theme,
    honoree: coin.honoree,
  };
}

/** The coin-story request body: every field present, missing ones as null. */
export function storyRequestBody(input: CoinStoryInput): Record<string, string | number | null> {
  return {
    year: input.year ?? null,
    denomination: input.denomination ?? null,
    country: input.country ?? null,
    mintMark: input.mintMark ?? null,
    series: input.series ?? null,
    designer: input.designer ?? null,
    name: input.name ?? null,
    specificCoinName: input.specificCoinName ?? null,
    theme: input.theme ?? null,
    honoree: input.honoree ?? null,
  };
}
