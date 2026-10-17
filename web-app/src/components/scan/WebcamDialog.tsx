'use client';

// Take one side's photo with the computer's camera. The camera is only open
// while this dialog is, so the browser's camera light goes off with it.
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { CoButton } from '@/components/co';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ScanSide } from './CaptureStep';

function cameraErrorText(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Allow it in your browser’s site settings, or choose a photo instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Choose a photo instead.';
  }
  if (name === 'NotReadableError') return 'The camera is in use by another app.';
  return 'The camera could not be opened. Choose a photo instead.';
}

export function WebcamDialog({
  side,
  onClose,
  onCapture,
}: {
  side: ScanSide | null;
  onClose: () => void;
  onCapture: (side: ScanSide, photo: File) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!side) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    setReady(false);
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' }, audio: false })
      .then(s => {
        if (stopped) return s.getTracks().forEach(t => t.stop());
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(err => !stopped && setError(cameraErrorText(err)));
    return () => {
      stopped = true;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [side]);

  const capture = () => {
    const el = video.current;
    if (!side || !el || !el.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    canvas.toBlob(
      blob => {
        if (blob) onCapture(side, new File([blob], `${side}.jpg`, { type: 'image/jpeg' }));
        else setError('That photo could not be taken. Try again.');
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <Dialog open={!!side} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl border-co-line bg-co-bg2">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-normal">
            Photograph the {side === 'reverse' ? 'back' : 'front'}
          </DialogTitle>
          <DialogDescription className="text-co-fg2">Center the coin in the ring, then take the photo.</DialogDescription>
        </DialogHeader>
        {/* The viewfinder stays dark in both themes, like a camera app. */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-black">
          {error ? (
            <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-[14px] text-white/80">{error}</p>
          ) : (
            <>
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setReady(true)}
                className="h-full w-full object-cover"
              />
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/40"
                aria-hidden
              />
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <CoButton variant="ghost" onClick={onClose}>
            Cancel
          </CoButton>
          <CoButton onClick={capture} disabled={!ready || !!error} leading={<Camera className="h-4 w-4" aria-hidden />}>
            Take photo
          </CoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
