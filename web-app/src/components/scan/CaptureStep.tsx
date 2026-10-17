'use client';

// Step one of a scan: a photo of each side. On a desktop most collectors
// already have photos, so each side takes a file (picked or dropped); a webcam
// works too where there is one.
import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, RotateCcw, ScanLine } from 'lucide-react';
import { Card, CoButton, Eyebrow } from '@/components/co';
import { PHOTO_ACCEPT_ATTRIBUTE, PhotoError, preparePhoto } from '@/lib/photos';
import { WebcamDialog } from './WebcamDialog';

export type ScanSide = 'obverse' | 'reverse';
export type ScanPhotos = Record<ScanSide, Blob | null>;

const SIDE_TEXT: Record<ScanSide, { name: string; tag: string; hint: string }> = {
  obverse: { name: 'Obverse', tag: 'OBV', hint: 'The front: usually the portrait and the date' },
  reverse: { name: 'Reverse', tag: 'REV', hint: 'The back: the design and often the denomination' },
};

function usePreview(photo: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) return setUrl(null);
    const next = URL.createObjectURL(photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return url;
}

function SideSlot({
  side,
  photo,
  error,
  hasCamera,
  onFile,
  onCamera,
  onClear,
}: {
  side: ScanSide;
  photo: Blob | null;
  error: string | null;
  hasCamera: boolean;
  onFile: (file: File) => void;
  onCamera: () => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const preview = usePreview(photo);
  const [dragging, setDragging] = useState(false);
  const text = SIDE_TEXT[side];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Eyebrow>{text.name}</Eyebrow>
        {photo && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg3 hover:text-co-fg"
          >
            <RotateCcw className="h-3 w-3" aria-hidden /> Replace
          </button>
        )}
      </div>
      {preview ? (
        <div className="relative aspect-square overflow-hidden rounded-md border border-co-line bg-co-bg3">
          <img src={preview} alt={`${text.name} photo`} className="h-full w-full object-cover" />
          {/* Sits on a photo, so it stays dark in both themes. */}
          <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-[#e7b551]">
            {text.tag}
          </span>
        </div>
      ) : (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={`flex aspect-square flex-col items-center justify-center gap-4 rounded-md border border-dashed p-6 text-center transition ${
            dragging ? 'border-co-gold bg-co-chip-active-bg' : 'border-co-line bg-co-bg2'
          }`}
        >
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-co-empty-ring">
            <span className="font-mono text-[11px] tracking-[0.14em] text-co-fg4">{text.tag}</span>
          </span>
          <p className="max-w-[16rem] text-[13px] text-co-fg3">{text.hint}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <CoButton variant="ghost" onClick={() => input.current?.click()} leading={<ImagePlus className="h-4 w-4" aria-hidden />}>
              Choose photo
            </CoButton>
            {hasCamera && (
              <CoButton variant="ghost" onClick={onCamera} leading={<Camera className="h-4 w-4" aria-hidden />}>
                Use camera
              </CoButton>
            )}
          </div>
          <p className="hidden font-mono text-[10px] tracking-[0.1em] text-co-fg4 md:block">OR DROP A PHOTO HERE</p>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-label={`${text.name} photo`}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="font-mono text-[10px] text-co-c-low">{error}</p>}
    </div>
  );
}

export function CaptureStep({
  photos,
  onChange,
  onScan,
}: {
  photos: ScanPhotos;
  onChange: (side: ScanSide, photo: Blob | null) => void;
  onScan: () => void;
}) {
  const [errors, setErrors] = useState<Record<ScanSide, string | null>>({ obverse: null, reverse: null });
  const [cameraSide, setCameraSide] = useState<ScanSide | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    // Only offer the camera where the browser can open one at all.
    setHasCamera(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  const take = async (side: ScanSide, file: File) => {
    setErrors(e => ({ ...e, [side]: null }));
    try {
      onChange(side, await preparePhoto(file));
    } catch (err) {
      setErrors(e => ({ ...e, [side]: err instanceof PhotoError ? err.message : 'That photo could not be used.' }));
    }
  };

  const ready = !!photos.obverse && !!photos.reverse;
  const step = !photos.obverse ? 'STEP 1 OF 2 · OBVERSE' : !photos.reverse ? 'STEP 2 OF 2 · REVERSE' : 'READY TO SCAN';

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <Eyebrow>{step}</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Scan a coin</h1>
        <p className="max-w-prose text-[15px] text-co-fg2">
          Add a photo of each side. We&apos;ll identify the coin, estimate its grade, tell you its story, and add it to
          your collection.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['obverse', 'reverse'] as const).map(side => (
            <SideSlot
              key={side}
              side={side}
              photo={photos[side]}
              error={errors[side]}
              hasCamera={hasCamera}
              onFile={file => void take(side, file)}
              onCamera={() => setCameraSide(side)}
              onClear={() => onChange(side, null)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 self-start">
          <Card className="flex flex-col gap-3 p-5">
            <Eyebrow>For the best read</Eyebrow>
            <ul className="flex flex-col gap-2 text-[13.5px] text-co-fg2">
              <li>Fill the frame with the coin, flat and square to the lens.</li>
              <li>Soft, even light from the side shows the relief. Avoid flash glare.</li>
              <li>Make sure the date and mint mark are in focus.</li>
              <li>A plain, dark background works best.</li>
            </ul>
          </Card>
          <CoButton onClick={onScan} disabled={!ready} leading={<ScanLine className="h-4 w-4" aria-hidden />} className="w-full">
            Scan coin
          </CoButton>
          {!ready && <p className="text-center text-[12px] text-co-fg3">Both sides are needed to identify a coin.</p>}
        </div>
      </div>

      <WebcamDialog
        side={cameraSide}
        onClose={() => setCameraSide(null)}
        onCapture={(side, file) => {
          setCameraSide(null);
          void take(side, file);
        }}
      />
    </div>
  );
}
