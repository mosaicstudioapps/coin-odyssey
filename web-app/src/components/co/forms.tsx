'use client';

// Form pieces matching the mobile Field, ChoiceRow, and Button.
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const LABEL = 'font-mono text-[9.5px] uppercase tracking-[0.12em] text-co-fg3';
const HELPER = 'font-mono text-[10px] tracking-[0.05em] text-co-fg4';

type FieldProps = {
  label: string;
  helper?: string;
  invalid?: boolean;
  rightSlot?: React.ReactNode;
  multiline?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

/** Labelled text input (or textarea with `multiline`). */
export const Field = forwardRef<HTMLInputElement & HTMLTextAreaElement, FieldProps>(function Field(
  { label, helper, invalid, rightSlot, multiline, className, ...rest },
  ref
) {
  const id = useId();
  const helperId = helper ? `${id}-helper` : undefined;
  const inputClass = cn(
    'w-full rounded-sm border bg-co-bg2 px-3 py-2.5 font-sans text-[15px] text-co-fg placeholder:text-co-fg4',
    'focus:outline-none focus-visible:border-co-gold-text',
    invalid ? 'border-co-c-low' : 'border-co-line',
    multiline ? 'min-h-[88px] resize-y' : 'min-h-[42px]',
    className
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        {rightSlot}
      </div>
      {multiline ? (
        <textarea ref={ref} id={id} aria-invalid={invalid || undefined} aria-describedby={helperId} className={inputClass} {...rest} />
      ) : (
        <input ref={ref} id={id} aria-invalid={invalid || undefined} aria-describedby={helperId} className={inputClass} {...rest} />
      )}
      {helper && (
        <p id={helperId} className={cn(HELPER, invalid && 'text-co-c-low')}>
          {helper}
        </p>
      )}
    </div>
  );
});

export interface Choice {
  value: string;
  label: string;
}

/** A row of single-choice chips (denomination, category, mint mark pickers). */
export function ChoiceRow({
  label,
  options,
  value,
  onChange,
  helper,
  invalid,
}: {
  label: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  invalid?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className={LABEL}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map(option => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'min-h-9 rounded-sm border px-3 py-2 font-sans text-sm transition-colors',
                selected
                  ? 'border-co-gold-deep bg-co-chip-active-bg text-co-gold-text'
                  : 'border-co-line bg-co-bg2 text-co-fg2 hover:border-co-fg4',
                invalid && !value && 'border-co-c-low'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {helper && <p className={cn(HELPER, invalid && 'text-co-c-low')}>{helper}</p>}
    </div>
  );
}

type ButtonVariant = 'gold' | 'ghost' | 'quiet';
const VARIANT: Record<ButtonVariant, string> = {
  gold: 'bg-co-gold text-co-gold-fg hover:brightness-105',
  ghost: 'border-co-line bg-transparent text-co-fg hover:bg-co-bg3',
  quiet: 'bg-co-bg3 text-co-fg hover:bg-co-bg4',
};

/** The app's pill button. */
export const CoButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; leading?: React.ReactNode; trailing?: React.ReactNode }
>(function CoButton({ variant = 'gold', leading, trailing, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-transparent px-4 py-3',
        'font-sans text-sm font-medium tracking-[-0.005em] transition active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        className
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
});
