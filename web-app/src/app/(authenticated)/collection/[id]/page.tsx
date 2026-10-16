'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  coinDetailSections,
  coinSubtitleLine,
  coinTitleLine,
  hasEnoughStoryDetail,
  storyInputFromCoin,
  type Coin,
} from '@coin-collecting/shared';
import { Card, CoButton, Eyebrow, ImageLightbox } from '@/components/co';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteCoin, getCoin, onCoinsChanged } from '@/lib/coins';
import { useCurrency } from '@/lib/currency';
import { generateAndSaveStory } from '@/lib/story';

export default function CoinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { format } = useCurrency();
  const [coin, setCoin] = useState<Coin | null>(null);
  const [missing, setMissing] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fresh = await getCoin(id);
      if (fresh) setCoin(fresh);
      else setMissing(true);
    } catch {
      // Keep what's on screen; the next change event retries.
    }
  }, [id]);

  useEffect(() => {
    void load();
    return onCoinsChanged(() => void load());
  }, [load]);

  if (missing) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-[26px]">This coin is no longer in your collection</h1>
        <Link href="/collection" className="font-mono text-[11px] uppercase tracking-[0.1em] text-co-gold-text">
          Back to the catalog
        </Link>
      </div>
    );
  }
  if (!coin) return <p className="text-co-fg3">Loading…</p>;

  const titleLine = coinTitleLine(coin);
  const subtitleLine = coinSubtitleLine(coin);
  const sections = coinDetailSections(coin, n => format(n));
  const story = coin.historicalNotes;
  const canRequestStory = hasEnoughStoryDetail(storyInputFromCoin(coin));

  const requestStory = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const written = await generateAndSaveStory(coin);
      if (!written) setStoryError("There isn't enough recorded about this coin to write an accurate note. Try adding the country or mint mark.");
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : 'Could not write a story right now.');
    } finally {
      setStoryLoading(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCoin(coin.id);
      router.push('/collection');
    } catch {
      setDeleteError('Could not delete. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/collection" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Catalog
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Photos */}
        <div className="grid grid-cols-2 gap-3 self-start">
          {([
            { key: 'obv', src: coin.obverseImage, label: 'OBV' },
            { key: 'rev', src: coin.reverseImage, label: 'REV' },
          ] as const).map(({ key, src, label }) =>
            src ? (
              <button
                key={key}
                type="button"
                onClick={() => setLightbox({ src, label })}
                className="group relative aspect-square overflow-hidden rounded-md border border-co-line bg-co-bg3"
                aria-label={`Enlarge the ${label === 'OBV' ? 'front' : 'back'} photo`}
              >
                <img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                {/* Sits on a photo, so it stays dark in both themes, like mobile. */}
                <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-[#e7b551]">{label}</span>
                <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-co-gold text-co-gold-fg">
                  <Plus className="h-3 w-3" strokeWidth={2.6} aria-hidden />
                </span>
              </button>
            ) : (
              <div key={key} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-co-line bg-co-bg2">
                <Info className="h-3.5 w-3.5 text-co-fg4" aria-hidden />
                <span className="font-mono text-[9.5px] tracking-[0.1em] text-co-fg4">{label} NOT PROVIDED</span>
              </div>
            )
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-1.5">
            <Eyebrow>Coin</Eyebrow>
            <h1 className="font-display text-[32px] leading-tight tracking-[-0.02em] text-balance">{titleLine}</h1>
            {subtitleLine && <p className="font-mono text-[11px] tracking-[0.1em] text-co-fg3">{subtitleLine}</p>}
            {coin.name && coin.name !== titleLine && <p className="text-[15px] text-co-fg2">{coin.name}</p>}
          </header>

          {(story || canRequestStory) && (
            <section className="flex flex-col gap-2" aria-labelledby="about">
              <h2 id="about" className="co-eyebrow">About this coin</h2>
              <Card className="p-4">
                {story ? (
                  <>
                    <p className="max-w-prose text-[15px] leading-relaxed text-co-fg">{story}</p>
                    <p className="mt-3 text-[12px] text-co-fg3">
                      Written by AI from numismatic references — enjoy the story, verify the specifics.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] text-co-fg2">
                      {storyLoading
                        ? 'Looking this coin up…'
                        : 'Every coin has a story — the designer, why the metal changed, what to look for. Ask for this one.'}
                    </p>
                    {storyError && <p className="mt-2 text-[13px] text-co-c-low">{storyError}</p>}
                    <CoButton className="mt-3" onClick={requestStory} disabled={storyLoading} leading={<Info className="h-4 w-4" aria-hidden />}>
                      {storyLoading ? 'Writing…' : storyError ? 'Try again' : 'Tell me about this coin'}
                    </CoButton>
                  </>
                )}
              </Card>
            </section>
          )}

          {coin.conditionNotes && (
            <section className="flex flex-col gap-2" aria-labelledby="condition">
              <h2 id="condition" className="co-eyebrow">Condition notes</h2>
              <Card className="p-4 text-[14px] text-co-fg">{coin.conditionNotes}</Card>
            </section>
          )}

          {coin.notes && (
            <section className="flex flex-col gap-2" aria-labelledby="notes">
              <h2 id="notes" className="co-eyebrow">Notes</h2>
              <Card className="whitespace-pre-line p-4 text-[14px] text-co-fg">{coin.notes}</Card>
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {sections.map(section => (
              <section key={section.title} className="flex flex-col gap-2" aria-label={section.title}>
                <h2 className="co-eyebrow">{section.title}</h2>
                <Card className="overflow-hidden">
                  <dl>
                    {section.rows.map((row, i) => (
                      <div key={row.label} className={`flex items-baseline justify-between gap-4 px-4 py-3 ${i > 0 ? 'border-t border-co-line' : ''}`}>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-co-fg3">{row.label}</dt>
                        <dd className="text-right text-[14px] text-co-fg">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              </section>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-co-line pt-5">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-[13px] text-co-c-low hover:underline"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete coin
            </button>
            <Link
              href={`/collection/${coin.id}/edit`}
              className="inline-flex items-center gap-2 rounded-full bg-co-gold px-5 py-3 text-sm font-medium text-co-gold-fg hover:brightness-105"
            >
              <Pencil className="h-4 w-4" aria-hidden /> Edit details
            </Link>
          </div>
        </div>
      </div>

      <ImageLightbox src={lightbox?.src ?? null} alt={`${titleLine}, ${lightbox?.label === 'OBV' ? 'front' : 'back'}`} caption={lightbox?.label} onClose={() => setLightbox(null)} />

      <Dialog open={confirmDelete} onOpenChange={open => !deleting && setConfirmDelete(open)}>
        <DialogContent className="border-co-line bg-co-bg2">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-normal">Delete coin</DialogTitle>
            <DialogDescription className="text-co-fg2">
              Permanently remove {titleLine}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-[13px] text-co-c-low">{deleteError}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <CoButton variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </CoButton>
            <CoButton onClick={remove} disabled={deleting} className="bg-co-c-low text-co-bg2">
              {deleting ? 'Deleting…' : 'Delete'}
            </CoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
