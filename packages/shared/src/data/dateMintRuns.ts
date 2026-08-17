import type { SpecificCoin } from '../types/series';

// Shared shape for classic date-and-mint-mark run series (Morgan dollars,
// Peace dollars, Walking Liberty halves) — the same generator approach as
// lincolnCents.ts, factored out because three series now need it.
//
// Slots come from compact per-mint year tables rather than hand-typed lists;
// tests pin the resulting counts. Deliberately excluded everywhere: die and
// mintmark-position varieties (1878 8TF/7TF Morgans, 1917-D/S obverse-vs-
// reverse Walking Liberty halves). Circulation date/mint runs only, matching
// how the Lincoln albums were built.

export interface DateMintDef {
  id: string;
  /** Slot label, e.g. "1893-S", "1921". */
  name: string;
  year: number;
  /** '' = Philadelphia (no mint mark). Others uppercase: 'D', 'S', 'O', 'CC'. */
  mintMark: string;
  /** Second line on the slot cell, e.g. "Proof only". */
  sublabel?: string;
  /** Normalized substrings required for a heuristic match. */
  keywords?: string[];
  /** Normalized substrings that must NOT appear. */
  excludeKeywords?: string[];
}

/** One mint's production years within a series. */
export interface MintRun {
  mintMark: string;
  years: number[];
}

/** Inclusive year range minus any years the mint sat out. */
export function years(start: number, end: number, skip: number[] = []): number[] {
  const out: number[] = [];
  for (let year = start; year <= end; year++) {
    if (!skip.includes(year)) out.push(year);
  }
  return out;
}

/** Standard numismatic ordering: no mark first, then mint marks alphabetically. */
const MINT_ORDER: Record<string, number> = { '': 0, CC: 1, D: 2, O: 3, S: 4 };

export function byYearThenMint(a: DateMintDef, b: DateMintDef): number {
  return a.year - b.year || (MINT_ORDER[a.mintMark] ?? 9) - (MINT_ORDER[b.mintMark] ?? 9);
}

export function dateMintId(prefix: string, year: number, mintMark: string): string {
  return `${prefix}_${year}${mintMark ? `_${mintMark.toLowerCase()}` : ''}`;
}

export function dateMintName(year: number, mintMark: string): string {
  return mintMark ? `${year}-${mintMark}` : `${year}`;
}

/** Expand per-mint year tables into sorted slot definitions. */
export function buildDateMintDefs(prefix: string, runs: MintRun[]): DateMintDef[] {
  const defs: DateMintDef[] = [];
  for (const run of runs) {
    for (const year of run.years) {
      defs.push({
        id: dateMintId(prefix, year, run.mintMark),
        name: dateMintName(year, run.mintMark),
        year,
        mintMark: run.mintMark,
      });
    }
  }
  return defs.sort(byYearThenMint);
}

/**
 * Apply keyword gates / sublabels to specific slots after generation, keyed by
 * slot id. Used where two series share a denomination and a year (the 1921
 * Morgan/Peace overlap) and generic text must not auto-fill either one.
 */
export function annotateDefs(
  defs: DateMintDef[],
  annotations: Record<string, Partial<Omit<DateMintDef, 'id' | 'year' | 'mintMark'>>>,
): DateMintDef[] {
  return defs.map(def => (annotations[def.id] ? { ...def, ...annotations[def.id] } : def));
}

/** Register slots as SpecificCoins so assignment can write specific_coin_name. */
export function toSpecificCoins(defs: DateMintDef[], suffix: string): SpecificCoin[] {
  return defs.map(def => ({
    id: def.id,
    name: `${def.name} ${suffix}`,
    year: def.year,
    ...(def.mintMark ? { mintMark: def.mintMark } : {}),
    ...(def.sublabel ? { description: def.sublabel } : {}),
  }));
}
