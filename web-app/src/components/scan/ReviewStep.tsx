'use client';

// Step three: what the scan found. The coin is already saved; from here the
// collector edits it, is done, or discards it. Lines and fields come from the
// shared scan module, so this reads the same as the mobile review screen.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Check, Pencil } from 'lucide-react';
import {
  COIN_CATEGORY_LABELS,
  formatMintMark,
  scanFilledAlbumTitle,
  scanReviewFields,
  scanReviewHeader,
} from '@coin-collecting/shared';
import { Card, CoButton, ConfBadge, Eyebrow, ImageLightbox } from '@/components/co';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteCoin } from '@/lib/coins';
import { ScanCheckCard } from './ScanCheckCard';
import type { WebScanResult } from '@/lib/scan';
import { cn } from '@/lib/utils';

const EYEBROW_TONE = { h: 'text-co-c-high', m: 'text-co-c-med', l: 'text-co-c-low', n: 'text-co-c-low' } as const;

export function ReviewStep({
  result,
  onDone,
  onDiscarded,
}: {
  result: WebScanResult;
  onDone: () => void;
  onDiscarded: () => void;
}) {
  // A correction from "Check these" replaces both, so every line shows what's saved.
  const [recognition, setRecognition] = useState(result.recognition);
  const [coin, setCoin] = useState(result.coin);
  const [checked, setChecked] = useState(false);
  const header = useMemo(() => scanReviewHeader(recognition, coin.name), [recognition, coin.name]);
  const fields = useMemo(
    () => scanReviewFields(recognition, formatMintMark, category => COIN_CATEGORY_LABELS[category]),
    [recognition]
  );
  const albumTitle = scanFilledAlbumTitle(coin);
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  const discard = async () => {
    setDiscarding(true);
    setDiscardError(null);
    try {
      await deleteCoin(coin.id);
      onDiscarded();
    } catch {
      setDiscardError('Could not discard. Please try again.');
      setDiscarding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <p className={cn('co-eyebrow', EYEBROW_TONE[header.level])}>{header.eyebrow}</p>
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg3 hover:text-co-fg"
          >
            Discard
          </button>
        </div>
        <h1 className="font-display text-[32px] leading-tight tracking-[-0.02em] text-balance">{header.title}</h1>
        {header.subtitle && <p className="font-mono text-[11px] tracking-[0.1em] text-co-fg3">{header.subtitle}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4 self-start">
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'obv', src: coin.obverseImage, label: 'OBV' },
              { key: 'rev', src: coin.reverseImage, label: 'REV' },
            ] as const).map(({ key, src, label }) =>
              src ? (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLightbox({ src, label })}
                  className="relative aspect-square overflow-hidden rounded-md border border-co-line bg-co-bg3"
                  aria-label={`Enlarge the ${label === 'OBV' ? 'front' : 'back'} photo`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-[#e7b551]">
                    {label}
                  </span>
                </button>
              ) : (
                <div key={key} className="aspect-square rounded-md border border-dashed border-co-line bg-co-bg2" />
              )
            )}
          </div>
          {albumTitle && (
            <div className="flex items-center gap-2 rounded-sm border border-co-gold-dim bg-co-chip-active-bg px-3.5 py-2.5">
              <BookOpen className="h-3.5 w-3.5 text-co-gold-text" aria-hidden />
              <span className="font-mono text-[11px] tracking-[0.06em] text-co-gold-text">Fills a slot in {albumTitle}</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {!checked && (
            <ScanCheckCard
              recognition={recognition}
              coin={coin}
              onConfirmed={() => setChecked(true)}
              onCorrected={(fixed, read) => {
                setCoin(fixed);
                setRecognition(read);
                setChecked(true);
              }}
            />
          )}
          <Card className="overflow-hidden">
            <dl className="grid sm:grid-cols-2">
              {fields.map((field, i) => (
                <div
                  key={field.label}
                  className={cn(
                    'flex flex-col gap-1 px-4 py-3',
                    i > 0 && 'border-t border-co-line',
                    i === 1 && 'sm:border-t-0',
                    i % 2 === 1 && 'sm:border-l sm:border-co-line'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-co-fg3">{field.label}</dt>
                    {field.placeholder ? (
                      <ConfBadge level="n" label="UNRECOGNIZED" />
                    ) : field.level ? (
                      <ConfBadge
                        level={field.level}
                        label={field.level === 'h' ? 'HIGH' : field.level === 'm' ? 'MED' : 'LOW'}
                        score={Math.round((field.score ?? 0) * 100)}
                      />
                    ) : null}
                  </div>
                  <dd className={cn('text-[15px]', field.placeholder ? 'text-co-fg3' : 'text-co-fg')}>{field.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {recognition.history && (
            <section className="flex flex-col gap-2" aria-labelledby="scan-about">
              <h2 id="scan-about" className="co-eyebrow">About this coin</h2>
              <Card className="p-4">
                <p className="max-w-prose text-[15px] leading-relaxed text-co-fg">{recognition.history}</p>
                <p className="mt-3 text-[12px] text-co-fg3">
                  Written by AI from numismatic references — enjoy the story, verify the specifics.
                </p>
              </Card>
            </section>
          )}

          {recognition.notes && (
            <section className="flex flex-col gap-2" aria-labelledby="scan-condition">
              <h2 id="scan-condition" className="co-eyebrow">Condition notes</h2>
              <Card className="p-4 text-[14px] italic text-co-fg2">{recognition.notes}</Card>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-co-line pt-5">
            <Link
              href={`/collection/${coin.id}/edit`}
              className="inline-flex items-center gap-2 rounded-full border border-co-line px-5 py-3 text-sm font-medium text-co-fg hover:bg-co-bg2"
            >
              <Pencil className="h-4 w-4" aria-hidden /> Edit details
            </Link>
            <CoButton onClick={onDone} leading={<Check className="h-4 w-4" strokeWidth={2.4} aria-hidden />} className="px-6">
              Done
            </CoButton>
          </div>
        </div>
      </div>

      <ImageLightbox
        src={lightbox?.src ?? null}
        alt={`${header.title}, ${lightbox?.label === 'OBV' ? 'front' : 'back'}`}
        caption={lightbox?.label}
        onClose={() => setLightbox(null)}
      />

      <Dialog open={confirmDiscard} onOpenChange={open => !discarding && setConfirmDiscard(open)}>
        <DialogContent className="border-co-line bg-co-bg2">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-normal">Discard this scan?</DialogTitle>
            <DialogDescription className="text-co-fg2">
              {coin.name || 'This coin'} and its photos will be removed from your collection.
            </DialogDescription>
          </DialogHeader>
          {discardError && <p className="text-[13px] text-co-c-low">{discardError}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <CoButton variant="ghost" onClick={() => setConfirmDiscard(false)} disabled={discarding}>
              Keep it
            </CoButton>
            <CoButton onClick={discard} disabled={discarding} className="bg-co-c-low text-co-bg2">
              {discarding ? 'Discarding…' : 'Discard'}
            </CoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
