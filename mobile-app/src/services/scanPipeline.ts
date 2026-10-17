import {
  PipelineError,
  runScanStages,
  type PipelineErrorType,
  type ScanResult as SharedScanResult,
  type StageId,
  type StageState,
  type StageUpdate,
} from '@coin-collecting/shared';
import { CoinRecognitionService } from './coinRecognitionService';
import { CoinService } from './coinService';
import { Coin } from '../types/coin';
import { Logger } from './logger';

// The stages, the coin a recognition becomes, and how failures are classified
// live in packages/shared (utils/scanPipeline.ts, utils/scanRules.ts), so the
// web scan runs the same steps. Re-exported for existing imports.
export { PipelineError };
export type { StageId, StageState, PipelineErrorType, StageUpdate };
export type ScanResult = SharedScanResult<Coin>;

export interface RunScanInput {
  obverseUri: string;
  reverseUri: string;
  onProgress: (u: StageUpdate) => void;
}

export async function runScan({
  obverseUri,
  reverseUri,
  onProgress,
}: RunScanInput): Promise<ScanResult> {
  const { recognition, coin } = await runScanStages<Coin>({
    recognize: () => CoinRecognitionService.recognizeCoin(obverseUri, reverseUri),
    save: fields =>
      CoinService.createCoin({ ...fields, obverseImage: obverseUri, reverseImage: reverseUri }),
    onProgress,
    logError: (message, err) => Logger.error(message, err),
  });

  return { recognition, coin, obverseUri, reverseUri };
}
