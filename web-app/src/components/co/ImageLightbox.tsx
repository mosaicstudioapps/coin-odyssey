'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Full-screen photo viewer. Like the mobile one, it stays black in both
 * themes: photos read best on black. Closes on Escape or a click outside.
 */
export function ImageLightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string | null;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/95 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from storage */}
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-full rounded-md object-contain"
        onClick={e => e.stopPropagation()}
      />
      {caption && <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">{caption}</p>}
    </div>
  );
}
