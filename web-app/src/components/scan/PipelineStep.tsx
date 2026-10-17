'use client';

// Step two: the four stages, ticking through as the scan runs. Same stages,
// words, and ways out of an error as the mobile screen.
import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type { PipelineError, StageState } from '@coin-collecting/shared';
import { CoButton, CoinDisc, Eyebrow } from '@/components/co';
import { cn } from '@/lib/utils';

// Stages describe the work, not the vendor: client copy can't keep up with a
// server-side model change.
const STAGES = [
  { title: 'Identifying coin', detail: 'Obverse and reverse · date, mint mark' },
  { title: 'Estimating grade', detail: 'Sheldon scale · wear, luster, strike' },
  { title: 'Gathering the story', detail: 'History · design · collecting notes' },
  { title: 'Cataloging entry', detail: 'Saving to your collection' },
];

export interface StageView {
  state: StageState;
  resultText?: string;
}

export const PENDING_STAGES: StageView[] = STAGES.map(() => ({ state: 'pending' }));

function Bullet({ state }: { state: StageState }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border',
        state === 'done' && 'border-co-gold bg-co-gold',
        state === 'warn' && 'border-co-c-med bg-co-c-med',
        state === 'error' && 'border-co-c-low bg-co-c-low',
        state === 'active' && 'border-co-gold bg-co-bg2',
        state === 'pending' && 'border-co-line bg-co-bg2'
      )}
      aria-hidden
    >
      {(state === 'done' || state === 'warn') && <Check className="h-3 w-3 text-co-gold-fg" strokeWidth={2.6} />}
      {state === 'error' && <X className="h-3 w-3 text-co-gold-fg" strokeWidth={2.6} />}
      {state === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-co-gold" />}
      {state === 'pending' && <span className="h-1 w-1 rounded-full bg-co-fg4" />}
    </span>
  );
}

const STATE_WORDS: Record<StageState, string> = {
  pending: 'waiting',
  active: 'in progress',
  done: 'done',
  warn: 'done, with a note',
  error: 'failed',
};

export function PipelineStep({
  obverse,
  stages,
  error,
  done,
  onRetry,
  onManual,
  onBack,
}: {
  obverse: Blob;
  stages: StageView[];
  error: PipelineError | null;
  done: boolean;
  onRetry: () => void;
  onManual: () => void;
  onBack: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(obverse);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [obverse]);

  const running = stages.some(s => s.state === 'active');
  const title = error ? 'Scan paused.' : done ? 'Done. Review below.' : 'One moment…';
  const soft = error && (error.type === 'unrecognized' || error.type === 'quota');

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <Eyebrow>{error ? 'SCAN ERROR' : 'SCANNING'}</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]" aria-live="polite">
          {title}
        </h1>
      </header>

      <div className="flex justify-center">
        <div className="relative flex h-[164px] w-[164px] items-center justify-center">
          <span
            className={cn(
              'absolute inset-0 rounded-full border border-dashed border-co-empty-ring',
              running && 'animate-[spin_8s_linear_infinite]'
            )}
            aria-hidden
          />
          <CoinDisc size={150} tone="copper" imageSrc={preview ?? undefined} />
          {done && !error && (
            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-co-gold">
              <Check className="h-[18px] w-[18px] text-co-gold-fg" strokeWidth={2.4} aria-hidden />
            </span>
          )}
        </div>
      </div>

      <ol className="flex flex-col">
        {STAGES.map((stage, i) => {
          const view = stages[i];
          const finished = view.state === 'done' || view.state === 'warn' || view.state === 'error';
          return (
            <li key={stage.title}>
              <div className="flex items-start gap-3.5 py-3.5">
                <Bullet state={view.state} />
                <div className="flex-1">
                  <p className={cn('text-[15px]', view.state === 'pending' ? 'text-co-fg4' : 'text-co-fg')}>
                    {stage.title}
                    <span className="sr-only">, {STATE_WORDS[view.state]}</span>
                  </p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-[11px] tracking-[0.04em]',
                      view.state === 'warn' ? 'text-co-c-med' : view.state === 'error' ? 'text-co-c-low' : 'text-co-fg4'
                    )}
                  >
                    {finished ? view.resultText ?? stage.detail : stage.detail}
                  </p>
                </div>
                {view.state === 'active' && (
                  <span className="mt-1 h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-co-gold border-t-transparent" aria-hidden />
                )}
              </div>
              {i < STAGES.length - 1 && (
                <span
                  className={cn(
                    'ml-[11px] block h-[18px] w-px',
                    view.state === 'done' ? 'bg-co-gold' : view.state === 'warn' ? 'bg-co-c-med' : 'bg-co-line'
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="flex flex-col gap-3">
          <div role="alert" className="flex items-start gap-2.5 rounded-md border border-co-c-low bg-co-bg2 p-4">
            {soft ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-co-c-low" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-co-c-low" aria-hidden />
            )}
            <p className="text-[14px] leading-snug text-co-fg">{error.message}</p>
          </div>
          <div className="flex gap-2.5">
            {soft ? (
              <>
                <CoButton className="flex-[1.2]" onClick={onManual}>
                  Add manually
                </CoButton>
                <CoButton variant="ghost" className="flex-1" onClick={onBack}>
                  Use other photos
                </CoButton>
              </>
            ) : error.type === 'rate_limit' ? (
              <CoButton variant="ghost" className="flex-1" onClick={onBack}>
                Back
              </CoButton>
            ) : (
              <>
                <CoButton className="flex-1" onClick={onRetry}>
                  Try again
                </CoButton>
                <CoButton variant="ghost" className="flex-1" onClick={onBack}>
                  Back
                </CoButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
