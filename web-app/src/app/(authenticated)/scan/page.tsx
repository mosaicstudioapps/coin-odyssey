'use client';

// Scan: photos → the four stages → review. One page, because the photos live
// in memory and shouldn't travel through a URL. A scan the recognizer can't
// identify (or one over the monthly limit) can still be typed in by hand,
// keeping its photos.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PipelineError, formValuesToFields, type StageUpdate } from '@coin-collecting/shared';
import { CoinForm } from '@/components/forms/CoinForm';
import { CaptureStep, type ScanPhotos } from '@/components/scan/CaptureStep';
import { PENDING_STAGES, PipelineStep, type StageView } from '@/components/scan/PipelineStep';
import { ReviewStep } from '@/components/scan/ReviewStep';
import { createCoin } from '@/lib/coins';
import { runWebScan, type WebScanResult } from '@/lib/scan';
import { backfillStoryInBackground } from '@/lib/story';

type Step = 'capture' | 'scanning' | 'review' | 'manual';

const NO_PHOTOS: ScanPhotos = { obverse: null, reverse: null };

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('capture');
  const [photos, setPhotos] = useState<ScanPhotos>(NO_PHOTOS);
  const [stages, setStages] = useState<StageView[]>(PENDING_STAGES);
  const [error, setError] = useState<PipelineError | null>(null);
  const [result, setResult] = useState<WebScanResult | null>(null);
  // Bumped on every run and every exit, so a scan that finishes after the
  // collector has left it can't pull them back.
  const run = useRef(0);
  const manualPhotos = useMemo(
    () => ({ obverse: photos.obverse ?? undefined, reverse: photos.reverse ?? undefined }),
    [photos]
  );

  const scan = useCallback(async () => {
    const { obverse, reverse } = photos;
    if (!obverse || !reverse) return;
    const id = ++run.current;
    setStep('scanning');
    setStages(PENDING_STAGES);
    setError(null);
    setResult(null);

    const onProgress = (u: StageUpdate) => {
      if (run.current !== id) return;
      setStages(prev => prev.map((s, i) => (i === u.stage - 1 ? { state: u.state, resultText: u.resultText ?? s.resultText } : s)));
    };

    try {
      const scanned = await runWebScan(obverse, reverse, onProgress);
      if (run.current !== id) return;
      setResult(scanned);
      // A beat on the finished checklist before the review, like mobile.
      setTimeout(() => run.current === id && setStep('review'), 600);
    } catch (err) {
      if (run.current !== id) return;
      setError(err instanceof PipelineError ? err : new PipelineError('unknown', 1, err instanceof Error ? err.message : 'Scan failed.'));
    }
  }, [photos]);

  const startOver = () => {
    run.current++;
    setPhotos(NO_PHOTOS);
    setStages(PENDING_STAGES);
    setError(null);
    setResult(null);
    setStep('capture');
  };

  const backToPhotos = () => {
    run.current++;
    setError(null);
    setStep('capture');
  };

  if (step === 'manual') {
    return (
      <CoinForm
        eyebrow="ADD COIN"
        title="Enter the details"
        saveLabel="Save coin"
        initialPhotos={manualPhotos}
        onCancel={backToPhotos}
        onSave={async (values, chosen) => {
          const coin = await createCoin(formValuesToFields(values, 'create'), chosen);
          backfillStoryInBackground(coin);
          router.push(`/collection/${coin.id}`);
        }}
      />
    );
  }

  if (step === 'review' && result) {
    return <ReviewStep result={result} onDone={() => router.push('/collection')} onDiscarded={startOver} />;
  }

  if (step === 'scanning' && photos.obverse) {
    return (
      <PipelineStep
        obverse={photos.obverse}
        stages={stages}
        error={error}
        done={!!result}
        onRetry={() => void scan()}
        onManual={() => {
          run.current++;
          setStep('manual');
        }}
        onBack={backToPhotos}
      />
    );
  }

  return (
    <CaptureStep
      photos={photos}
      onChange={(side, photo) => setPhotos(p => ({ ...p, [side]: photo }))}
      onScan={() => void scan()}
    />
  );
}
