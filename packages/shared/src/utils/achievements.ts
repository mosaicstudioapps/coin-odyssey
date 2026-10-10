import type {
  AchievementCount,
  AchievementCriterion,
  AchievementDefinition,
  AchievementInput,
  AchievementProgress,
} from '../types/achievement';
import { ACHIEVEMENTS } from '../data/achievements';
import { resolveCountryCode } from '../data/worldCountries';
import { normalizeDenomination } from './normalize';

/** Collection facts every criterion reads from, gathered in one pass. */
interface CollectionSummary {
  counts: Record<AchievementCount, number>;
  /** Inclusive span of known years, or 0 with none. */
  yearSpan: number;
  /** Earliest known year, or null. */
  oldestYear: number | null;
  categories: Set<string>;
  albums: AchievementInput['albums'];
  accountCreatedAt: string | null;
}

function summarize(input: AchievementInput): CollectionSummary {
  const countries = new Set<string>();
  const denominations = new Set<string>();
  const categories = new Set<string>();
  let notedCoins = 0;
  let scannedCoins = 0;
  let minYear = Infinity;
  let maxYear = -Infinity;
  let oldestYear: number | null = null;

  for (const coin of input.coins) {
    // The same country vocabulary as the map and the World album, so
    // "Türkiye" and "Turkey" count once and the numbers agree across screens.
    const code = resolveCountryCode(coin.country);
    if (code) countries.add(code);

    const denomination = normalizeDenomination(coin.denomination);
    if (denomination) denominations.add(denomination);

    if (coin.category) categories.add(coin.category);
    if (coin.notes && coin.notes.trim()) notedCoins += 1;
    if (coin.source === 'scan') scannedCoins += 1;

    // Year 0 means unknown. The span matches the dashboard's "years of
    // history", which counts positive years only.
    if (coin.year > 0) {
      minYear = Math.min(minYear, coin.year);
      maxYear = Math.max(maxYear, coin.year);
    }
    if (coin.year !== 0 && (oldestYear === null || coin.year < oldestYear)) {
      oldestYear = coin.year;
    }
  }

  const albumSlots = input.albums.reduce((sum, album) => sum + album.filled, 0);
  const albumSections = input.albums.reduce((sum, album) => sum + album.completeSections, 0);
  const completeAlbums = input.albums.filter(
    album => album.total > 0 && album.filled >= album.total
  ).length;

  return {
    counts: {
      coins: input.coins.length,
      countries: countries.size,
      denominations: denominations.size,
      categories: categories.size,
      notedCoins,
      scannedCoins,
      albumSlots,
      albumSections,
      completeAlbums,
    },
    yearSpan: Number.isFinite(minYear) ? maxYear - minYear + 1 : 0,
    oldestYear,
    categories,
    albums: input.albums,
    accountCreatedAt: input.accountCreatedAt,
  };
}

function measure(
  criterion: AchievementCriterion,
  summary: CollectionSummary
): { current: number; required: number } {
  switch (criterion.kind) {
    case 'count':
      return { current: summary.counts[criterion.of], required: criterion.atLeast };
    case 'yearSpan':
      return { current: summary.yearSpan, required: criterion.atLeast };
    case 'coinBefore': {
      // An ancient coin is older than any cutoff we use, even when its exact
      // year wasn't recorded.
      const met =
        summary.categories.has('ancient') ||
        (summary.oldestYear !== null && summary.oldestYear < criterion.year);
      return { current: met ? 1 : 0, required: 1 };
    }
    case 'category':
      return { current: summary.categories.has(criterion.category) ? 1 : 0, required: 1 };
    case 'albumComplete': {
      const album = summary.albums.find(a => a.id === criterion.albumId);
      if (!album || album.total === 0) return { current: 0, required: 1 };
      return { current: album.filled, required: album.total };
    }
    case 'joinedBefore': {
      const joined = summary.accountCreatedAt ? Date.parse(summary.accountCreatedAt) : NaN;
      const met = Number.isFinite(joined) && joined < Date.parse(criterion.date);
      return { current: met ? 1 : 0, required: 1 };
    }
  }
}

/**
 * Progress on every achievement for one collection. Pure: no I/O and no
 * clock, so the same input always gives the same answer.
 */
export function evaluateAchievements(
  input: AchievementInput,
  definitions: readonly AchievementDefinition[] = ACHIEVEMENTS
): AchievementProgress[] {
  const summary = summarize(input);
  return definitions.map(definition => {
    const { current, required } = measure(definition.criterion, summary);
    return { id: definition.id, current, required, met: current >= required };
  });
}
