'use client';

import type { AlbumView } from '@coin-collecting/shared';
import { cn } from '@/lib/utils';

const OPTIONS: { value: AlbumView; label: string; hint: string }[] = [
  { value: 'mint', label: 'By mint', hint: 'A P and a D slot for each design, like a folder' },
  { value: 'design', label: 'By design', hint: 'One slot per design, from either mint' },
];

/** "By mint / By design", for the quarter albums. */
export function AlbumViewToggle({ view, onChange }: { view: AlbumView; onChange: (view: AlbumView) => void }) {
  return (
    <div role="radiogroup" aria-label="Album layout" className="flex w-fit gap-1 rounded-full border border-co-line bg-co-bg3 p-1">
      {OPTIONS.map(option => {
        const selected = option.value === view;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors',
              selected ? 'bg-co-bg2 text-co-gold-text shadow-sm' : 'text-co-fg3 hover:text-co-fg'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
