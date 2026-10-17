// The four scan stages, run the same way on mobile and web. Each app supplies
// the two platform pieces: how photos reach the recognizer, and how a coin is
// saved with its photos. Moved from mobile-app/src/services/scanPipeline.ts in
// Phase 4 of the web plan.
import type { Coin, CoinSource } from '../types/coin';
import { coerceCoinCategory, type CoinCategory } from '../types/coin';
import type { CoinRecognitionResult } from '../types/recognition';
import { buildAlbums } from '../data/albums';
import { resolveScanAlbumTag } from './albumFills';
import { buildCoinName } from './coinNames';
import { canonicalizeMintMark } from './normalize';
import {
  PipelineError,
  RecognitionError,
  isAuthError,
  isNetworkError,
  shortIdentityLine,
  type StageUpdate,
} from './scanRules';

/** What a scan saves. The app adds the photos. */
export interface ScanCoinFields {
  name: string;
  year: number;
  denomination: string;
  country?: string;
  mintMark?: string;
  category?: CoinCategory;
  source: CoinSource;
  grade?: string;
  conditionNotes?: string;
  composition?: string;
  faceValue?: number;
  historicalNotes?: string;
  seriesId?: string;
  specificCoinId?: string;
  specificCoinName?: string;
}

/**
 * The coin a recognition becomes. If it unambiguously matches one album slot,
 * the coin is pre-tagged so it fills that slot; tagging is best-effort and
 * never blocks the save.
 */
export function scanCoinFields(
  recognition: CoinRecognitionResult,
  onTagError?: (err: unknown) => void
): ScanCoinFields {
  const mintMark = canonicalizeMintMark(recognition.mintMark);

  let albumTag: ReturnType<typeof resolveScanAlbumTag> = null;
  try {
    albumTag = resolveScanAlbumTag(
      {
        name: recognition.denomination,
        design: recognition.design,
        year: recognition.year,
        mintMark,
        country: recognition.country,
        denomination: recognition.denomination,
      },
      buildAlbums()
    );
  } catch (err) {
    onTagError?.(err);
  }

  return {
    // buildCoinName prefers `design`, so a shelf of state quarters doesn't all
    // read "2022 Quarter Dollar".
    name: buildCoinName(recognition),
    ...(albumTag ?? {}),
    year: recognition.year ?? 0,
    denomination: recognition.denomination ?? 'Unknown',
    country: recognition.country ?? undefined,
    mintMark: mintMark ?? undefined,
    category: coerceCoinCategory(recognition.category) ?? undefined,
    source: 'scan',
    grade: recognition.grade ?? undefined,
    // The recognizer's observation, not the collector's: it has its own field
    // so Notes stays theirs (and Notetaker counts real notes).
    conditionNotes: recognition.notes ?? undefined,
    // Saved so "Silver" and "Gold" can match by metal.
    composition: recognition.composition ?? undefined,
    faceValue: recognition.faceValue ?? undefined,
    historicalNotes: recognition.history ?? undefined,
  };
}

/** Turns a failed recognition call into the pipeline error the screens show. */
export function recognitionFailure(err: unknown): PipelineError {
  if (err instanceof RecognitionError) {
    if (err.code === 'rate_limit') return new PipelineError('rate_limit', 1, err.message);
    if (err.code === 'quota_exceeded') return new PipelineError('quota', 1, err.message);
    if (err.code === 'auth') return new PipelineError('auth', 1, err.message);
    if (err.code === 'service_unavailable') return new PipelineError('network', 1, err.message);
  }
  if (isAuthError(err)) return new PipelineError('auth', 1, 'Sign in to scan coins.');
  if (isNetworkError(err)) {
    return new PipelineError('network', 1, 'Network unavailable. Your captures are saved — try again.');
  }
  return new PipelineError('unknown', 1, err instanceof Error ? err.message : 'Identification failed.');
}

/** Turns a failed save into the pipeline error the screens show. */
export function saveFailure(err: unknown, recognition: CoinRecognitionResult): PipelineError {
  if (isAuthError(err)) return new PipelineError('auth', 4, 'Sign in to save this coin.', { recognition });
  if (isNetworkError(err)) {
    return new PipelineError(
      'network',
      4,
      'Could not save — network unavailable. Your captures are preserved.',
      { recognition }
    );
  }
  return new PipelineError('save_failed', 4, err instanceof Error ? err.message : 'Save failed.', { recognition });
}

export interface ScanStagesInput<C extends Coin> {
  recognize: () => Promise<CoinRecognitionResult>;
  save: (fields: ScanCoinFields) => Promise<C>;
  onProgress: (update: StageUpdate) => void;
  /** Failures go here before they're turned into a PipelineError. */
  logError?: (message: string, err: unknown) => void;
  /** Pause on the grade and story stages so each shows as active. */
  dwellMs?: number;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Identify, grade, gather the story, and catalog. One recognizer call answers
 * the first three; the save is the fourth. Throws a PipelineError, carrying the
 * recognition when there is one, so the screen can offer the right way out.
 */
export async function runScanStages<C extends Coin>({
  recognize,
  save,
  onProgress,
  logError,
  dwellMs = 350,
}: ScanStagesInput<C>): Promise<{ recognition: CoinRecognitionResult; coin: C }> {
  // ---- Stage 1: Identify (stages 2 and 3 piggy-back on this call)
  onProgress({ stage: 1, state: 'active' });
  let recognition: CoinRecognitionResult;
  try {
    recognition = await recognize();
  } catch (err) {
    logError?.('Pipeline stage 1 failed', err);
    onProgress({ stage: 1, state: 'error' });
    throw recognitionFailure(err);
  }

  if (recognition.confidence === 'unrecognized') {
    onProgress({ stage: 1, state: 'error', resultText: 'Could not identify' });
    throw new PipelineError(
      'unrecognized',
      1,
      "We couldn't identify this coin. Try better lighting or enter details manually.",
      { recognition }
    );
  }
  onProgress({ stage: 1, state: 'done', resultText: shortIdentityLine(recognition) });

  // ---- Stage 2: Grade (already in the same response)
  onProgress({ stage: 2, state: 'active' });
  await wait(dwellMs);
  if (recognition.grade) {
    onProgress({ stage: 2, state: 'done', resultText: `${recognition.grade} · ${recognition.gradeConfidence} confidence` });
  } else {
    onProgress({ stage: 2, state: 'warn', resultText: 'Grade not estimated' });
  }

  // ---- Stage 3: Background (also from the same response)
  onProgress({ stage: 3, state: 'active' });
  await wait(dwellMs);
  if (recognition.history) {
    onProgress({ stage: 3, state: 'done', resultText: 'Story captured' });
  } else {
    onProgress({ stage: 3, state: 'warn', resultText: 'No background available' });
  }

  // ---- Stage 4: Catalog
  onProgress({ stage: 4, state: 'active' });
  const fields = scanCoinFields(recognition, err => logError?.('Album tag resolution failed (continuing without tag)', err));
  let coin: C;
  try {
    coin = await save(fields);
  } catch (err) {
    logError?.('Pipeline stage 4 failed', err);
    onProgress({ stage: 4, state: 'error' });
    throw saveFailure(err, recognition);
  }
  onProgress({ stage: 4, state: 'done', resultText: 'Added to collection' });

  return { recognition, coin };
}

// ---- The review screen

export type ConfidenceLevel = 'h' | 'm' | 'l' | 'n';

export function confidenceLevel(c: string | null | undefined): ConfidenceLevel {
  return c === 'high' ? 'h' : c === 'medium' ? 'm' : c === 'low' ? 'l' : 'n';
}

export function confidenceScore(c: string | null | undefined): number {
  return c === 'high' ? 0.9 : c === 'medium' ? 0.7 : c === 'low' ? 0.4 : 0;
}

export interface ScanReviewField {
  label: string;
  value: string;
  /** Only where the recognizer scores this field on its own: today, the grade alone. */
  level?: ConfidenceLevel;
  score?: number;
  /** The recognizer left this one blank. */
  placeholder: boolean;
}

function reviewField(label: string, raw: string | number | null | undefined, conf?: string | null): ScanReviewField {
  const has = raw !== null && raw !== undefined && String(raw).trim() !== '';
  return {
    label,
    value: has ? String(raw) : '—',
    ...(has && conf ? { level: confidenceLevel(conf), score: confidenceScore(conf) } : {}),
    placeholder: !has,
  };
}

/** Face value in the coin's own currency, e.g. "$0.25" or "0.5 XYZ". */
export function formatScanFaceValue(value: number, currency: string | null): string {
  if (currency) {
    try {
      return value.toLocaleString('en-US', { style: 'currency', currency });
    } catch {
      // Unknown ISO code: fall through to plain formatting.
    }
  }
  return currency ? `${value} ${currency}` : String(value);
}

/**
 * The review screen's field list. The recognizer returns one overall
 * confidence plus one for the grade, so only the grade row carries a badge;
 * stamping the overall score on every row read as eight separate verdicts.
 */
export function scanReviewFields(
  recognition: CoinRecognitionResult,
  formatMintMark: (mark: string | null) => string | null,
  categoryLabel: (category: CoinCategory) => string
): ScanReviewField[] {
  const category = coerceCoinCategory(recognition.category);
  return [
    reviewField('COUNTRY', recognition.country),
    reviewField('YEAR', recognition.year),
    reviewField('DENOMINATION', recognition.denomination),
    reviewField('MINT MARK', formatMintMark(canonicalizeMintMark(recognition.mintMark))),
    reviewField('CATEGORY', category ? categoryLabel(category) : null),
    reviewField('COMPOSITION', recognition.composition),
    reviewField('ESTIMATED GRADE', recognition.grade, recognition.gradeConfidence),
    reviewField(
      'FACE VALUE',
      recognition.faceValue != null ? formatScanFaceValue(recognition.faceValue, recognition.currency) : null
    ),
  ];
}

/** The review screen's header lines. */
export function scanReviewHeader(recognition: CoinRecognitionResult, coinName: string | undefined) {
  const title = [recognition.country, recognition.denomination].filter(Boolean).join(' · ') || coinName || 'Untitled coin';
  const subtitleParts = [recognition.year ? String(recognition.year) : null, recognition.composition, recognition.grade].filter(Boolean);
  const pct = Math.round(confidenceScore(recognition.confidence) * 100);
  const prefix =
    recognition.confidence === 'high' ? '✓ IDENTIFIED' : recognition.confidence === 'medium' ? '~ IDENTIFIED' : 'TENTATIVE';
  return {
    title,
    subtitle: subtitleParts.length ? subtitleParts.join(' · ').toUpperCase() : null,
    eyebrow: `${prefix} · ${pct}%`,
    level: confidenceLevel(recognition.confidence),
  };
}

/** The album a scanned coin was pre-tagged into, if any. */
export function scanFilledAlbumTitle(coin: Pick<Coin, 'seriesId' | 'specificCoinId'>): string | null {
  if (!coin.specificCoinId || !coin.seriesId) return null;
  return buildAlbums().find(album => album.seriesId === coin.seriesId)?.title ?? null;
}
