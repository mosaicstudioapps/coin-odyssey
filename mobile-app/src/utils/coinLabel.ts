import { Coin } from '../types/coin';

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
