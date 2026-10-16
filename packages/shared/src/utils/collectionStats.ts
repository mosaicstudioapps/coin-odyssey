// What the dashboard and the world map show about a collection, shared so
// mobile and web agree. Moved unchanged from mobile-app (DashboardScreen,
// MapScreen) in Phase 1 of the web plan; `now` is a parameter so the monthly
// numbers can be tested.
import type { Coin } from '../types/coin';
import { getCountryByCode, resolveCountryCode } from '../data/worldCountries';
import type { AchievementStatus } from './achievementSync';

export interface YearSpan {
  min: number;
  max: number;
  /** Inclusive: a lone 1943 cent still represents one year of history. */
  years: number;
}

/** The dashboard's "years of history": oldest to newest known year. */
export function computeYearSpan(coins: Pick<Coin, 'year'>[]): YearSpan | null {
  const years = coins.map(c => c.year).filter((y): y is number => typeof y === 'number' && y > 0);
  if (!years.length) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  return { min, max, years: max - min + 1 };
}

/**
 * Countries in the collection, as codes from the shared country table (the
 * one the World Coins album uses), so "Türkiye" and "Turkey" count once and
 * every screen prints the same number.
 */
export function collectedCountryCodes(coins: Pick<Coin, 'country'>[]): string[] {
  const codes = new Set<string>();
  for (const c of coins) {
    const code = resolveCountryCode(c.country);
    if (code) codes.add(code);
  }
  return Array.from(codes);
}

/** The most recently added coins, newest first. */
export function recentCoins<C extends Pick<Coin, 'createdAt'>>(coins: C[], count = 4): C[] {
  return [...coins]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, count);
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Five labels under the 12-month chart: oldest, 3-month steps, current. */
export function computeMonthTicks(now: Date = new Date()): string[] {
  const offsets = [11, 8, 5, 2, 0];
  return offsets.map(monthsBack => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const label = MONTH_NAMES[d.getMonth()];
    // Only annotate year on the bookends (oldest + newest)
    if (monthsBack === 11 || monthsBack === 0) {
      return `${label} '${String(d.getFullYear()).slice(-2)}`;
    }
    return label;
  });
}

const ZERO_SERIES: number[] = new Array(12).fill(0);

/** Running total of coins in the collection at the end of each of the last 12 months. */
export function buildMonthlySeries(coins: Pick<Coin, 'createdAt'>[], now: Date = new Date()): number[] {
  if (coins.length === 0) return [...ZERO_SERIES];
  const buckets = new Array(12).fill(0);
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
  for (const c of coins) {
    const t = new Date(c.createdAt || now).getTime();
    if (t < cutoff) buckets.forEach((_, i) => (buckets[i] += 1));
    else {
      const d = new Date(t);
      const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 11;
      for (let i = Math.max(0, idx); i < 12; i++) buckets[i] += 1;
    }
  }
  return buckets;
}

/** Change from the first month to the last, or null when there's nothing to compare. */
export function computeDelta(series: number[]): { abs: number; pct: number } | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  if (first === 0 && last === 0) return null;
  const abs = last - first;
  const pct = first === 0 ? 0 : (abs / first) * 100;
  return { abs, pct };
}

/** Earned badges, most recently unlocked first; earned-but-unsaved go last. */
export function recentBadges(achievements: AchievementStatus[], count: number): AchievementStatus[] {
  return achievements
    .filter(a => a.earned)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
    .slice(0, count);
}

/** The unearned badge the collection is closest to, among ones with a count to show. */
export function nextBadge(achievements: AchievementStatus[]): AchievementStatus | null {
  let best: AchievementStatus | null = null;
  for (const a of achievements) {
    if (a.earned || a.required <= 1 || a.current <= 0) continue;
    if (!best || a.current / a.required > best.current / best.required) best = a;
  }
  return best;
}

export interface CountryRow {
  code: string;
  name: string;
  coins: number;
  earliest: number | null;
  latest: number | null;
}

/** One row per country in the collection, most coins first, for the world map. */
export function buildCountryRows(coins: Pick<Coin, 'country' | 'year'>[]): CountryRow[] {
  const byCode = new Map<string, CountryRow>();
  for (const c of coins) {
    const code = resolveCountryCode(c.country);
    if (!code) continue;
    const existing = byCode.get(code);
    if (existing) {
      existing.coins += 1;
      if (c.year && (existing.earliest == null || c.year < existing.earliest)) existing.earliest = c.year;
      if (c.year && (existing.latest == null || c.year > existing.latest)) existing.latest = c.year;
    } else {
      byCode.set(code, {
        code,
        name: getCountryByCode(code)?.name ?? c.country ?? code,
        coins: 1,
        earliest: c.year || null,
        latest: c.year || null,
      });
    }
  }
  return Array.from(byCode.values()).sort((a, b) => b.coins - a.coins);
}

/** Countries the map suggests collecting next. */
export const MAP_FRONTIERS = ['Iceland', 'Mongolia', 'Peru', 'Vietnam', 'Morocco', 'Iran'];

/** Countries the World Coins album and the map count against. */
export const WORLD_COUNTRY_TOTAL = 195;
