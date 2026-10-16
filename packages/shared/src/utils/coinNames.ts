// How coins are named (what a scan saves) and labelled (what lists show).
// Moved from mobile-app/src/utils in Phase 1 of the web plan.
import type { Coin } from '../types/coin';
import { isKnownDenomination, normalizeDenomination, normalizeText } from './normalize';

/**
 * The name a scanned coin is saved under.
 *
 * The counterpart to `coinLabel`, which decides what to *show*; this decides
 * what to *store* when a scan creates the coin.
 *
 * Some design names already carry the denomination ("Delaware State Quarter")
 * and some are a bare honoree ("Maya Angelou"), which reads as a fragment on
 * its own. Append the denomination only in the second case, so neither
 * "1999 Delaware State Quarter Quarter Dollar" nor a dangling "2022 Maya
 * Angelou" can happen.
 *
 * Denominations are compared through the shared vocabulary rather than by
 * text, so "Penny" is recognised as already named by "Lincoln Wheat Cent".
 */
export function buildCoinName(recognition: {
  year?: number | null;
  denomination?: string | null;
  design?: string | null;
}): string {
  const year = recognition.year ? String(recognition.year) : '';
  const denomination = recognition.denomination?.trim() ?? '';
  const design = recognition.design?.trim() ?? '';

  if (design) {
    const alreadyNamesDenomination =
      isKnownDenomination(denomination) &&
      normalizeText(design).includes(normalizeDenomination(denomination));
    return (
      [year, design, alreadyNamesDenomination ? '' : denomination]
        .filter(Boolean)
        .join(' ') || 'Untitled coin'
    );
  }

  return [year, denomination].filter(Boolean).join(' ') || 'Untitled coin';
}

/**
 * The name to show for a coin in lists and cards.
 *
 * Order matters. `name` comes first because it is the field the collector
 * edits and therefore the one they expect to see — a card that ignores a
 * name someone just typed reads as the edit not having saved.
 *
 * `specificCoinName` is only set once a coin is matched to an album slot, so
 * relying on it alone left every untagged coin showing its bare denomination
 * ("Quarter Dollar") no matter what it had been named.
 *
 * Scanned coins that matched no design arrive named "<year> <denomination>",
 * which duplicates the year shown beside it. That redundancy is accepted
 * deliberately: showing what the coin is actually called beats hiding it.
 */
export function coinLabel(coin: Pick<Coin, 'name' | 'specificCoinName' | 'denomination'>): string {
  return coin.name?.trim() || coin.specificCoinName?.trim() || coin.denomination?.trim() || 'Coin';
}

/** Lowercased text a collection search should match a coin against. */
export function coinSearchText(
  coin: Pick<Coin, 'name' | 'specificCoinName' | 'denomination' | 'country' | 'year' | 'series'>
): string {
  return [coin.name, coin.specificCoinName, coin.denomination, coin.country, coin.series, coin.year]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
