'use client';

// The web scan: photos are shrunk on a canvas to fit the recognizer's upload
// budget, sent to the recognize-coin edge function, and saved through the same
// four stages as mobile (packages/shared, scanPipeline.ts and scanRules.ts).
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  RecognitionError,
  SCAN_COMPRESSION_LADDER,
  guardRecognizedFields,
  perImageScanBudget,
  runScanStages,
  type Coin,
  type CoinRecognitionResult,
  type RecognitionAPIResponse,
  type StageUpdate,
} from '@coin-collecting/shared';
import { supabase } from '@/lib/supabase';
import { createCoin } from '@/lib/coins';

function jpegDataUrl(bitmap: ImageBitmap, width: number, quality: number): string | null {
  const scale = Math.min(1, width / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * A photo as base64 JPEG within its share of the upload budget. Steps down the
 * shared compression ladder (1024px, then smaller) like mobile. An oversized
 * request doesn't fail, it stalls for minutes, so the smallest rung is the
 * floor and there is no fallback to the original.
 */
export async function scanImageBase64(photo: Blob, budgetBytes: number): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(photo);
  } catch {
    throw new RecognitionError('Could not prepare these photos for scanning. Please use other ones.', 'unknown');
  }
  try {
    let smallest: string | null = null;
    for (const step of SCAN_COMPRESSION_LADDER) {
      const dataUrl = jpegDataUrl(bitmap, step.width, step.quality);
      const encoded = dataUrl?.split(',')[1];
      if (!encoded) continue;
      smallest = encoded;
      if (encoded.length <= budgetBytes) return encoded;
    }
    if (smallest) return smallest;
  } finally {
    bitmap.close();
  }
  throw new RecognitionError('Could not prepare these photos for scanning. Please use other ones.', 'unknown');
}

/** Identify a coin from its two photos with the recognize-coin edge function. */
export async function recognizeCoin(obverse: Blob, reverse: Blob): Promise<CoinRecognitionResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new RecognitionError('Please sign in to scan coins.', 'auth');

  const budget = perImageScanBudget(2);
  const body = {
    mediaType: 'image/jpeg',
    obverseImage: await scanImageBase64(obverse, budget),
    reverseImage: await scanImageBase64(reverse, budget),
  };

  const { data, error } = await supabase.functions.invoke('recognize-coin', { body });
  if (error) {
    // A non-2xx arrives with its body unread; read it so the real reason shows.
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
    if (status === 401) throw new RecognitionError('Your session has expired. Please sign in again.', 'auth');
    throw new RecognitionError(serverMessage ?? 'Recognition service unavailable. Please try again.', 'service_unavailable');
  }

  const response = data as RecognitionAPIResponse;
  if (!response.success || !response.result) {
    throw new RecognitionError(response.error ?? 'Recognition failed', response.code ?? 'unknown');
  }
  // Year and mint mark are checked here, at the boundary, so the review
  // screen shows exactly what gets stored.
  const guarded = guardRecognizedFields(response.result);
  return { ...response.result, year: guarded.year, mintMark: guarded.mintMark };
}

export interface WebScanResult {
  recognition: CoinRecognitionResult;
  coin: Coin;
}

export function runWebScan(
  obverse: Blob,
  reverse: Blob,
  onProgress: (update: StageUpdate) => void
): Promise<WebScanResult> {
  return runScanStages<Coin>({
    recognize: () => recognizeCoin(obverse, reverse),
    save: fields => createCoin(fields, { obverse, reverse }),
    onProgress,
    logError: (message, err) => console.error(message, err),
  });
}
