// The parts of a scan that don't depend on the device: how big the upload may
// be, the compression steps to try, the four stages, and how failures are
// classified. Shared so mobile and web scans fail the same way and show the
// same messages. Image resizing itself is per platform (expo-image-manipulator
// on mobile, a canvas on web). Moved from mobile-app (scanPipeline.ts,
// coinRecognitionService.ts) in Phase 1 of the web plan.
import type { Coin } from '../types/coin';
import type { CoinRecognitionResult, RecognitionErrorCode } from '../types/recognition';

/**
 * Supabase Edge Functions reject request bodies somewhere between 400KB and
 * 600KB, by stalling until the ~160s gateway wall clock rather than returning
 * 413, so an oversized scan looks like a hang with no error. Measured
 * 2026-08-10: 400KB responded in 5.5s, 600KB died at 165s. The whole request
 * stays well under that, split across the images.
 */
export const MAX_SCAN_BASE64_BYTES = 350 * 1024;

/**
 * Tried in order until an image fits its share of the budget. 1024px keeps a
 * coin's date and mint mark legible; the lower rungs are for busy or noisy
 * photos that don't compress well. The model downscales past 1568px anyway.
 */
export const SCAN_COMPRESSION_LADDER = [
  { width: 1024, quality: 0.7 },
  { width: 820, quality: 0.6 },
  { width: 640, quality: 0.5 },
] as const;

/** Each image's share of the upload budget, in base64 bytes. */
export function perImageScanBudget(imageCount: number): number {
  return Math.floor(MAX_SCAN_BASE64_BYTES / Math.max(1, imageCount));
}

export class RecognitionError extends Error {
  code: RecognitionErrorCode;
  constructor(message: string, code: RecognitionErrorCode) {
    super(message);
    this.code = code;
  }
}

export type StageId = 1 | 2 | 3 | 4;
export type StageState = 'pending' | 'active' | 'done' | 'warn' | 'error';
export type PipelineErrorType = 'network' | 'unrecognized' | 'auth' | 'rate_limit' | 'quota' | 'save_failed' | 'unknown';

export interface StageUpdate {
  stage: StageId;
  state: StageState;
  resultText?: string;
}

export interface ScanResult<C extends Coin = Coin> {
  recognition: CoinRecognitionResult;
  coin: C;
  obverseUri: string;
  reverseUri: string;
}

export class PipelineError extends Error {
  type: PipelineErrorType;
  stage: StageId;
  partial?: { recognition?: CoinRecognitionResult };

  constructor(type: PipelineErrorType, stage: StageId, message: string, partial?: PipelineError['partial']) {
    super(message);
    this.type = type;
    this.stage = stage;
    this.partial = partial;
  }
}

/** "United States · Quarter · 1999", shown when the identify stage finishes. */
export function shortIdentityLine(r: CoinRecognitionResult): string {
  const parts = [r.country, r.denomination, r.year ? String(r.year) : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Identification incomplete';
}

export function isNetworkError(err: unknown): boolean {
  const m = err instanceof Error ? err.message.toLowerCase() : '';
  return m.includes('network') || m.includes('fetch') || m.includes('timeout') || m.includes('connection');
}

export function isAuthError(err: unknown): boolean {
  const m = err instanceof Error ? err.message.toLowerCase() : '';
  return m.includes('sign in') || m.includes('not authenticated') || m.includes('unauthorized');
}
