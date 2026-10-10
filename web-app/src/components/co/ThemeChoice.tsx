'use client';

import { THEME_OPTIONS, useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/lib/utils';

/** System / Light / Dark, as in the mobile app's Settings > Theme. Applies at once. */
export function ThemeChoice({ compact }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex gap-1 rounded-full border border-co-line bg-co-bg3 p-1">
      {THEME_OPTIONS.map(option => {
        const selected = option.value === preference;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.hint}
            onClick={() => setPreference(option.value)}
            className={cn(
              'flex-1 rounded-full font-mono uppercase tracking-[0.08em] transition-colors',
              compact ? 'px-2.5 py-1 text-[9.5px]' : 'px-3.5 py-1.5 text-[10.5px]',
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
