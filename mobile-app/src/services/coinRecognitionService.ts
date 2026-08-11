import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  CoinRecognitionResult,
  RecognitionAPIResponse,
  RecognitionErrorCode,
} from '../types/recognition';
import { Logger } from './logger';

// The recognition model downscales anything larger than 1568px on the long edge,
// so a full-resolution camera capture buys no extra accuracy — it just inflates
// the upload. Raw captures ran several MB each, and base64 adds ~33% on top;
// two of those pushed the request past the edge function's wall clock.
// Supabase Edge Functions reject request bodies somewhere between 400KB and
// 600KB — and they do it by stalling until the ~160s gateway wall clock rather
// than returning 413, so an oversized scan looks like a hang with no error.
// Measured 2026-08-10: 400KB responded in 5.5s, 600KB died at 165s.
// Budget the whole request well under that, then split it across the images.
const MAX_TOTAL_BASE64_BYTES = 350 * 1024;

// Tried in order until an image fits its share of the budget. 1024px keeps a
// coin's date and mint mark legible; the lower rungs are for busy or noisy
// photos that don't compress well.
const COMPRESSION_LADDER = [
  { width: 1024, quality: 0.7 },
  { width: 820, quality: 0.6 },
  { width: 640, quality: 0.5 },
];

export class RecognitionError extends Error {
  code: RecognitionErrorCode;
  constructor(message: string, code: RecognitionErrorCode) {
    super(message);
    this.code = code;
  }
}

export class CoinRecognitionService {
  /**
   * Downscale a capture to the largest size the recognition model can actually
   * use, re-encode as JPEG, and return it base64-encoded.
   *
   * Falls back to the raw file if resizing fails — a slightly slow scan beats a
   * failed one.
   */
  static async imageToBase64(uri: string, budgetBytes: number): Promise<string> {
    // Resize by width only — no measuring step. Reading dimensions first (via
    // Image.getSize) is unreliable for local file:// URIs on iOS, and a rejection
    // there previously fell back to uploading the raw capture.
    let smallest: string | null = null;

    for (const step of COMPRESSION_LADDER) {
      let encoded: string | undefined;
      try {
        const result = await manipulateAsync(
          uri,
          [{ resize: { width: step.width } }],
          { compress: step.quality, format: SaveFormat.JPEG, base64: true }
        );
        encoded = result.base64;
      } catch (err) {
        Logger.warn('Image compression step failed', { width: step.width, err });
        continue;
      }

      if (!encoded) continue;
      smallest = encoded;

      if (encoded.length <= budgetBytes) {
        Logger.info('Image prepared for upload', {
          width: step.width,
          quality: step.quality,
          base64Kb: Math.round(encoded.length / 1024),
        });
        return encoded;
      }

      Logger.warn('Image over size budget; trying a smaller step', {
        width: step.width,
        base64Kb: Math.round(encoded.length / 1024),
        budgetKb: Math.round(budgetBytes / 1024),
      });
    }

    if (smallest) return smallest;

    // Never fall back to the raw capture: an oversized body doesn't error, it
    // stalls for ~160s and then fails, which is worse than a clear message.
    throw new RecognitionError(
      'Could not prepare these photos for scanning. Please retake them.',
      'unknown'
    );
  }

  /**
   * Recognize a coin from one or two images by calling the Supabase Edge Function.
   */
  static async recognizeCoin(
    obverseUri: string | null,
    reverseUri: string | null
  ): Promise<CoinRecognitionResult> {
    if (!obverseUri && !reverseUri) {
      throw new Error('At least one image is required');
    }

    // Get the current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Please sign in to use coin recognition');
    }

    // Convert images to base64
    const body: Record<string, string> = {
      mediaType: 'image/jpeg',
    };

    const imageCount = (obverseUri ? 1 : 0) + (reverseUri ? 1 : 0);
    const perImageBudget = Math.floor(MAX_TOTAL_BASE64_BYTES / imageCount);

    if (obverseUri) {
      body.obverseImage = await this.imageToBase64(obverseUri, perImageBudget);
    }
    if (reverseUri) {
      body.reverseImage = await this.imageToBase64(reverseUri, perImageBudget);
    }

    const totalBytes =
      (body.obverseImage?.length ?? 0) + (body.reverseImage?.length ?? 0);

    Logger.info('Calling coin recognition service', {
      hasObverse: !!obverseUri,
      hasReverse: !!reverseUri,
      totalKb: Math.round(totalBytes / 1024),
    });

    const { data, error } = await supabase.functions.invoke('recognize-coin', {
      body,
    });

    if (error) {
      // supabase-js surfaces a non-2xx as FunctionsHttpError and leaves the
      // response body unread. Without parsing it every server-side failure looks
      // identical, which is how a plain misconfiguration masqueraded as an
      // outage. Read the body so the real reason reaches the logs and the user.
      let status: number | undefined;
      let serverMessage: string | undefined;

      if (error instanceof FunctionsHttpError) {
        status = error.context?.status;
        try {
          const payload = await error.context.json();
          serverMessage = payload?.error;
          Logger.error('Recognition function returned an error', { status, payload });
        } catch {
          Logger.error('Recognition function returned an unreadable error', { status });
        }
      } else {
        Logger.error('Coin recognition edge function error', error);
      }

      if (status === 401) {
        throw new RecognitionError(
          'Your session has expired. Please sign in again.',
          'auth'
        );
      }

      throw new RecognitionError(
        serverMessage ?? 'Recognition service unavailable. Please try again.',
        'service_unavailable'
      );
    }

    const response = data as RecognitionAPIResponse;

    if (!response.success || !response.result) {
      throw new RecognitionError(
        response.error ?? 'Recognition failed',
        response.code ?? 'unknown'
      );
    }

    Logger.info('Coin recognized', {
      confidence: response.result.confidence,
      denomination: response.result.denomination,
    });

    return response.result;
  }
}
