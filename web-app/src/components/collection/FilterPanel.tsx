'use client';

import { useEffect, useState } from 'react';
import { GRADE_FILTER_OPTIONS, countActiveFilters, defaultFilters, type CoinFilters } from '@coin-collecting/shared';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CoButton } from '@/components/co';
import { cn } from '@/lib/utils';

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const SECTION = 'font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg3';
const CHIP = 'rounded-sm border px-3 py-1.5 text-[13px] transition-colors';
const CHIP_ON = 'border-co-gold-deep bg-co-chip-active-bg text-co-gold-text';
const CHIP_OFF = 'border-co-line bg-co-bg2 text-co-fg2 hover:border-co-fg4';

function RangeField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label htmlFor={id} className="flex flex-1 flex-col gap-1">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-co-fg4">{label}</span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        className="rounded-sm border border-co-line bg-co-bg2 px-3 py-2 text-sm text-co-fg placeholder:text-co-fg4 focus:outline-none focus-visible:border-co-gold-text"
      />
    </label>
  );
}

/** Filters, matching the mobile filter sheet. Changes apply on "Apply". */
export function FilterPanel({
  open,
  onOpenChange,
  filters,
  countries,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CoinFilters;
  countries: string[];
  onApply: (filters: CoinFilters) => void;
}) {
  const [draft, setDraft] = useState<CoinFilters>(filters);
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(filters);
    setMinYear(filters.minYear?.toString() ?? '');
    setMaxYear(filters.maxYear?.toString() ?? '');
    setMinValue(filters.minValue?.toString() ?? '');
    setMaxValue(filters.maxValue?.toString() ?? '');
  }, [open, filters]);

  const toggleCountry = (country: string) =>
    setDraft(d => ({
      ...d,
      countries: d.countries.includes(country) ? d.countries.filter(c => c !== country) : [...d.countries, country],
    }));

  const apply = () => {
    onApply({
      ...draft,
      minYear: parseNumber(minYear),
      maxYear: parseNumber(maxYear),
      minValue: parseNumber(minValue),
      maxValue: parseNumber(maxValue),
    });
    onOpenChange(false);
  };

  const clear = () => {
    onApply(defaultFilters);
    onOpenChange(false);
  };

  const activeCount = countActiveFilters(filters);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-co-line bg-co-bg p-0 sm:max-w-md">
        <SheetHeader className="border-b border-co-line px-6 py-5 text-left">
          <SheetTitle className="co-eyebrow">Filters{activeCount > 0 ? ` · ${activeCount}` : ''}</SheetTitle>
          <SheetDescription className="sr-only">Narrow the collection by country, year, value, and grade.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-2.5" aria-labelledby="filter-country">
            <h3 id="filter-country" className={SECTION}>Country</h3>
            {countries.length === 0 ? (
              <p className="text-[13px] text-co-fg3">Add a coin to start filtering by country.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {countries.map(country => {
                  const on = draft.countries.includes(country);
                  return (
                    <button key={country} type="button" aria-pressed={on} onClick={() => toggleCountry(country)} className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}>
                      {country}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-2.5" aria-labelledby="filter-year">
            <h3 id="filter-year" className={SECTION}>Year</h3>
            <div className="flex gap-3">
              <RangeField id="filter-year-from" label="From" value={minYear} onChange={setMinYear} placeholder="1900" />
              <RangeField id="filter-year-to" label="To" value={maxYear} onChange={setMaxYear} placeholder={String(new Date().getFullYear())} />
            </div>
          </section>

          <section className="space-y-2.5" aria-labelledby="filter-value">
            <h3 id="filter-value" className={SECTION}>Value (USD)</h3>
            <div className="flex gap-3">
              <RangeField id="filter-value-min" label="Min" value={minValue} onChange={setMinValue} placeholder="0" />
              <RangeField id="filter-value-max" label="Max" value={maxValue} onChange={setMaxValue} placeholder="1000" />
            </div>
          </section>

          <section className="space-y-2.5" aria-labelledby="filter-grade">
            <h3 id="filter-grade" className={SECTION}>Min grade</h3>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="filter-grade">
              {GRADE_FILTER_OPTIONS.map(option => {
                const on = draft.minGrade === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDraft(d => ({ ...d, minGrade: option.value }))}
                    className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex gap-3 border-t border-co-line px-6 py-4">
          <CoButton variant="ghost" className="flex-1" onClick={clear}>
            Clear
          </CoButton>
          <CoButton className="flex-[1.4]" onClick={apply}>
            Apply
          </CoButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
