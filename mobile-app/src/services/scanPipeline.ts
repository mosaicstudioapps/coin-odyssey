import { buildAlbums } from '@coin-collecting/shared';
import { CoinRecognitionService, RecognitionError } from './coinRecognitionService';
import { CoinService } from './coinService';
import { resolveScanAlbumTag } from './albumService';
import { CoinRecognitionResult } from '../types/recognition';
import { Coin } from '../types/coin';
import { Logger } from './logger';

export type StageId = 1 | 2 | 3 | 4;
export type StageState = 'pending' | 'active' | 'done' | 'warn' | 'error';
export type PipelineErrorType =
  | 'network'
  | 'unrecognized'
  | 'auth'
  | 'rate_limit'
  | 'quota'
  | 'save_failed'
  | 'unknown';

export interface StageUpdate {
  stage: StageId;
  state: StageState;
  resultText?: string;
}

export interface ScanResult {
  recognition: CoinRecognitionResult;
  coin: Coin;
  obverseUri: string;
  reverseUri: string;
}

export class PipelineError extends Error {
  type: PipelineErrorType;
  stage: StageId;
  partial?: { recognition?: CoinRecognitionResult };

  constructor(
    type: PipelineErrorType,
    stage: StageId,
    message: string,
    partial?: PipelineError['partial']
  ) {
    super(message);
    this.type = type;
    this.stage = stage;
    this.partial = partial;
  }
}

export interface RunScanInput {
  obverseUri: string;
  reverseUri: string;
  onProgress: (u: StageUpdate) => void;
}

function shortIdentityLine(r: CoinRecognitionResult): string {
  const parts = [r.country, r.denomination, r.year ? String(r.year) : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Identification incomplete';
}

function isNetworkError(err: unknown): boolean {
  const m = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('connection')
  );
}

function isAuthError(err: unknown): boolean {
  const m = err instanceof Error ? err.message.toLowerCase() : '';
  return m.includes('sign in') || m.includes('not authenticated') || m.includes('unauthorized');
}

export async function runScan({
  obverseUri,
  reverseUri,
  onProgress,
}: RunScanInput): Promise<ScanResult> {
  // ---- Stage 1: Identify (stages 2 and 3 piggy-back on this call) ----
  onProgress({ stage: 1, state: 'active' });

  let recognition: CoinRecognitionResult;
  try {
    recognition = await CoinRecognitionService.recognizeCoin(obverseUri, reverseUri);
  } catch (err) {
    Logger.error('Pipeline stage 1 failed', err);
    onProgress({ stage: 1, state: 'error' });
    if (err instanceof RecognitionError) {
      if (err.code === 'rate_limit') {
        throw new PipelineError('rate_limit', 1, err.message);
      }
      if (err.code === 'quota_exceeded') {
        throw new PipelineError('quota', 1, err.message);
      }
      if (err.code === 'auth') {
        throw new PipelineError('auth', 1, err.message);
      }
      if (err.code === 'service_unavailable') {
        throw new PipelineError('network', 1, err.message);
      }
    }
    if (isAuthError(err)) throw new PipelineError('auth', 1, 'Sign in to scan coins.');
    if (isNetworkError(err)) {
      throw new PipelineError('network', 1, 'Network unavailable. Your captures are saved — try again.');
    }
    throw new PipelineError(
      'unknown',
      1,
      err instanceof Error ? err.message : 'Identification failed.'
    );
  }

  if (recognition.confidence === 'unrecognized') {
    onProgress({ stage: 1, state: 'error', resultText: 'Could not identify' });
    throw new PipelineError(
      'unrecognized',
      1,
      'We couldn\'t identify this coin. Try better lighting or enter details manually.',
      { recognition }
    );
  }

  onProgress({ stage: 1, state: 'done', resultText: shortIdentityLine(recognition) });

  // ---- Stage 2: Grade (already in the same response) ----
  onProgress({ stage: 2, state: 'active' });
  // brief synthetic dwell so the UI can show the active state
  await new Promise((r) => setTimeout(r, 350));

  if (recognition.grade) {
    onProgress({
      stage: 2,
      state: 'done',
      resultText: `${recognition.grade} · ${recognition.gradeConfidence} confidence`,
    });
  } else {
    onProgress({ stage: 2, state: 'warn', resultText: 'Grade not estimated' });
  }

  // ---- Stage 3: Background (also from the same response) ----
  onProgress({ stage: 3, state: 'active' });
  await new Promise((r) => setTimeout(r, 350));

  if (recognition.history) {
    onProgress({ stage: 3, state: 'done', resultText: 'Story captured' });
  } else {
    onProgress({ stage: 3, state: 'warn', resultText: 'No background available' });
  }

  // ---- Stage 4: Catalog ----
  onProgress({ stage: 4, state: 'active' });

  // Album tagging: if the recognition unambiguously matches exactly one album
  // slot, save the coin pre-tagged so it fills that slot. Best-effort only —
  // never blocks the save.
  let albumTag: ReturnType<typeof resolveScanAlbumTag> = null;
  try {
    albumTag = resolveScanAlbumTag(
      {
        name: recognition.denomination,
        design: recognition.design,
        year: recognition.year,
        mintMark: recognition.mintMark,
        country: recognition.country,
        denomination: recognition.denomination,
      },
      buildAlbums()
    );
  } catch (err) {
    Logger.error('Album tag resolution failed (continuing without tag)', err);
  }

  let coin: Coin;
  try {
    coin = await CoinService.createCoin({
      name:
        recognition.denomination && recognition.year
          ? `${recognition.year} ${recognition.denomination}`
          : recognition.denomination ?? 'Untitled coin',
      ...(albumTag ?? {}),
      year: recognition.year ?? 0,
      denomination: recognition.denomination ?? 'Unknown',
      country: recognition.country ?? undefined,
      mintMark: recognition.mintMark ?? undefined,
      grade: recognition.grade ?? undefined,
      notes: recognition.notes ?? undefined,
      faceValue: recognition.faceValue ?? undefined,
      historicalNotes: recognition.history ?? undefined,
      obverseImage: obverseUri,
      reverseImage: reverseUri,
    });
  } catch (err) {
    Logger.error('Pipeline stage 4 failed', err);
    onProgress({ stage: 4, state: 'error' });
    if (isAuthError(err)) {
      throw new PipelineError('auth', 4, 'Sign in to save this coin.', { recognition });
    }
    if (isNetworkError(err)) {
      throw new PipelineError(
        'network',
        4,
        'Could not save — network unavailable. Your captures are preserved.',
        { recognition }
      );
    }
    throw new PipelineError(
      'save_failed',
      4,
      err instanceof Error ? err.message : 'Save failed.',
      { recognition }
    );
  }

  onProgress({ stage: 4, state: 'done', resultText: 'Added to collection' });

  return {
    recognition,
    coin,
    obverseUri,
    reverseUri,
  };
}
