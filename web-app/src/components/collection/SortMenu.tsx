'use client';

import { ArrowUpDown, Check } from 'lucide-react';
import { SORT_OPTIONS, type SortOption } from '@coin-collecting/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Sort choices from the mobile sort sheet: each key, each direction. */
export function SortMenu({ sort, onChange }: { sort: SortOption; onChange: (sort: SortOption) => void }) {
  const current = SORT_OPTIONS.find(o => o.key === sort.key);
  const currentLabel = current ? (sort.direction === 'asc' ? current.ascLabel : current.descLabel) : '';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-10 items-center gap-2 rounded-full border border-co-line bg-co-bg2 px-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-co-fg2 hover:border-co-fg4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-co-gold-text"
        aria-label={`Sort: ${current?.label}, ${currentLabel}`}
      >
        <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
        Sort
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-co-line bg-co-bg2">
        {SORT_OPTIONS.map((option, i) => (
          <div key={option.key}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="co-eyebrow py-1.5">{option.label}</DropdownMenuLabel>
            {(['desc', 'asc'] as const).map(direction => {
              const selected = sort.key === option.key && sort.direction === direction;
              return (
                <DropdownMenuItem key={direction} onSelect={() => onChange({ key: option.key, direction })} className="justify-between">
                  {direction === 'asc' ? option.ascLabel : option.descLabel}
                  {selected && <Check className="h-3.5 w-3.5 text-co-gold-text" aria-label="Selected" />}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
