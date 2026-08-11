import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  CoinRecognitionResult,
  RecognitionAPIResponse,
  RecognitionErrorCode,
} from '../types/recognition';
import { Logger } from './logger';
import * as FileSystem from 'expo-file-system/legacy';

// The recognition model downscales anything larger than 1568px on the long edge,
// so a full-resolution camera capture buys no extra accuracy — it just inflates
// the upload. Raw captures ran several MB each, and base64 adds ~33% on top;
// two of those pushed the request past the edge function's wall clock.
const MAX_IMAGE_EDGE = 1568;
const JPEG_QUALITY = 0.75;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

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
  static async imageToBase64(uri: string): Promise<string> {
    try {
      const { width, height } = await getImageSize(uri);
      const longEdge = Math.max(width, height);
      const actions =
        longEdge > MAX_IMAGE_EDGE
          ? [
              {
                resize:
                  width >= height
                    ? { width: MAX_IMAGE_EDGE }
                    : { height: MAX_IMAGE_EDGE },
              },
            ]
          : [];

      const result = await manipulateAsync(uri, actions, {
        compress: JPEG_QUALITY,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (result.base64) return result.base64;
      Logger.warn('Image manipulation returned no base64; using raw file');
    } catch (err) {
      Logger.warn('Image downscale failed; uploading raw capture', err);
    }

    return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
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

    if (obverseUri) {
      body.obverseImage = await this.imageToBase64(obverseUri);
    }
    if (reverseUri) {
      body.reverseImage = await this.imageToBase64(reverseUri);
    }

    Logger.info('Calling coin recognition service', {
      hasObverse: !!obverseUri,
      hasReverse: !!reverseUri,
    });

    const { data, error } = await supabase.functions.invoke('recognize-coin', {
      body,
    });

    if (error) {
      Logger.error('Coin recognition edge function error', error);
      if (error instanceof FunctionsHttpError && error.context?.status === 401) {
        throw new RecognitionError(
          'Your session has expired. Please sign in again.',
          'auth'
        );
      }
      throw new RecognitionError(
        'Recognition service unavailable. Please try again.',
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
