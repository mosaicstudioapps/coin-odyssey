// Collection search, quick chips, filters, and sort, shared so the mobile and
// web collection lists show the same coins in the same order. Moved from
// mobile-app (CollectionListScreen, FilterSheet, SortSheet) in Phase 1 of the
// web plan, unchanged.
//
// "Silver" and "Gold" mean the coin's metal (see coinMetal.ts). The value
// filter and sort still read purchasePrice.
import type { Coin } from '../types/coin';
import { coinSearchText } from './coinNames';
import { coinMetal } from './coinMetal';

export interface CoinFilters {
  countries: string[];
  minYear: number | null;
  maxYear: number | null;
  minValue: number | null;
  maxValue: number | null;
  minGrade: number | null;
}

export const defaultFilters: CoinFilters = {
  countries: [],
  minYear: null,
  maxYear: null,
  minValue: null,
  maxValue: null,
  minGrade: null,
};

/** Minimum-grade choices in the filter panel. */
export const GRADE_FILTER_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: 'G-6+', value: 6 },
  { label: 'VG-10+', value: 10 },
  { label: 'F-15+', value: 15 },
  { label: 'VF-30+', value: 30 },
  { label: 'XF-45+', value: 45 },
  { label: 'AU-55+', value: 55 },
  { label: 'MS-60+', value: 60 },
  { label: 'MS-65+', value: 65 },
];

export type SortKey = 'date' | 'value' | 'year' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  key: SortKey;
  direction: SortDirection;
}

export const defaultSort: SortOption = { key: 'date', direction: 'desc' };

export const SORT_OPTIONS: { key: SortKey; label: string; ascLabel: string; descLabel: string }[] = [
  { key: 'date', label: 'Date added', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { key: 'value', label: 'Value', ascLabel: 'Low → High', descLabel: 'High → Low' },
  { key: 'year', label: 'Year', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { key: 'name', label: 'Alphabetical', ascLabel: 'A → Z', descLabel: 'Z → A' },
];

export const QUICK_CHIPS = ['All', 'Silver', 'Gold', 'Pre-1950', 'MS-60+', 'Americas'] as const;
export type QuickChip = (typeof QUICK_CHIPS)[number];

export function chipMatches(coin: Coin, chip: string): boolean {
  switch (chip) {
    case 'All':
      return true;
    case 'Silver':
      return coinMetal(coin) === 'silver';
    case 'Gold':
      return coinMetal(coin) === 'gold';
    case 'Pre-1950':
      return (coin.year || 0) < 1950;
    case 'MS-60+': {
      const g = (coin.grade || '').toUpperCase();
      if (!g.startsWith('MS-')) return false;
      const n = parseInt(g.slice(3), 10);
      return Number.isFinite(n) && n >= 60;
    }
    case 'Americas': {
      const c = (coin.country || '').toLowerCase();
      return /(united states|canada|mexico|brazil|argentina|chile|peru|colombia|venezuela)/.test(c);
    }
    default:
      return true;
  }
}

/** The number in a grade like "MS-65" or "VF20", or null. */
export function gradeNumeric(grade?: string | null): number | null {
  if (!grade) return null;
  const m = grade.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function passesFilters(c: Coin, f: CoinFilters): boolean {
  if (f.countries.length && (!c.country || !f.countries.includes(c.country))) return false;
  if (f.minYear != null && (c.year ?? 0) < f.minYear) return false;
  if (f.maxYear != null && (c.year ?? Number.MAX_SAFE_INTEGER) > f.maxYear) return false;
  if (f.minValue != null && (c.purchasePrice ?? 0) < f.minValue) return false;
  if (f.maxValue != null && (c.purchasePrice ?? Number.MAX_SAFE_INTEGER) > f.maxValue) return false;
  if (f.minGrade != null) {
    const n = gradeNumeric(c.grade);
    if (n == null || n < f.minGrade) return false;
  }
  return true;
}

export function applySort<C extends Coin>(list: C[], sort: SortOption): C[] {
  const dir = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (sort.key) {
      case 'date':
        return (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * dir;
      case 'value':
        return ((a.purchasePrice ?? 0) - (b.purchasePrice ?? 0)) * dir;
      case 'year':
        return ((a.year ?? 0) - (b.year ?? 0)) * dir;
      case 'name':
        return (a.name ?? a.denomination ?? '').localeCompare(b.name ?? b.denomination ?? '') * dir;
      default:
        return 0;
    }
  });
  return sorted;
}

/** Search, chip, and filters, then sort: what the collection list shows. */
export function filterCollection<C extends Coin>(
  coins: C[],
  options: { query: string; chip: string; filters: CoinFilters; sort: SortOption }
): C[] {
  const q = options.query.trim().toLowerCase();
  const filtered = coins.filter(c => {
    if (!chipMatches(c, options.chip)) return false;
    if (!passesFilters(c, options.filters)) return false;
    if (!q) return true;
    // Searching the name matters most for coins the collector renamed
    // themselves — those have no specificCoinName to match on.
    return coinSearchText(c).includes(q);
  });
  return applySort(filtered, options.sort);
}

/** How many filter groups are set, for the badge on the filter button. */
export function countActiveFilters(filters: CoinFilters): number {
  let n = 0;
  if (filters.countries.length) n++;
  if (filters.minYear != null || filters.maxYear != null) n++;
  if (filters.minValue != null || filters.maxValue != null) n++;
  if (filters.minGrade != null) n++;
  return n;
}

/** Country names present in the collection, sorted, for the filter panel. */
export function collectionCountries(coins: Coin[]): string[] {
  const set = new Set<string>();
  coins.forEach(c => c.country && set.add(c.country));
  return Array.from(set).sort();
}
