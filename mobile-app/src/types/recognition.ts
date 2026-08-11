export type RecognitionConfidence = 'high' | 'medium' | 'low' | 'unrecognized';

export interface CoinRecognitionResult {
  denomination: string | null;
  year: number | null;
  country: string | null;
  currency: string | null;
  /** Face (circulation) value in the coin's own currency, e.g. 0.25 for a US quarter. */
  faceValue: number | null;
  mintMark: string | null;
  /**
   * For series/commemorative coins, the specific design or honoree (e.g.
   * "Delaware State Quarter", "Maya Angelou"). Optional: older deployed
   * versions of the edge function do not return it.
   */
  design?: string | null;
  composition: string | null;
  confidence: RecognitionConfidence;
  grade: string | null;
  gradeConfidence: RecognitionConfidence;
  notes: string | null;
  /** "About this coin" — short educational background for the collector. */
  history: string | null;
  error?: string;
}

export type RecognitionErrorCode =
  | 'rate_limit'
  | 'quota_exceeded'
  | 'service_unavailable'
  | 'payload_too_large'
  | 'auth'
  | 'unknown';

export interface RecognitionAPIResponse {
  success: boolean;
  result?: CoinRecognitionResult;
  error?: string;
  code?: RecognitionErrorCode;
}
