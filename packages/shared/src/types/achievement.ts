// Achievements: badges earned from what a collection contains. Like albums,
// the definitions are pure data and progress is computed from the user's
// coins, so the same rules serve every app. Only the unlock itself is stored
// (user_achievements), so a badge stays earned with its date even if the
// coins behind it are later deleted.

import type { AlbumId } from './album';
import type { CoinCategory, CoinSource } from './coin';

/** Badge color, lowest to highest. */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** Section headings on the Achievements screen, in display order. */
export type AchievementGroup =
  | 'collection'
  | 'world'
  | 'history'
  | 'albums'
  | 'curiosity'
  | 'special';

/** Things the evaluator can count across a collection. */
export type AchievementCount =
  | 'coins'
  | 'countries'
  | 'denominations'
  | 'categories'
  | 'notedCoins'
  | 'scannedCoins'
  | 'albumSlots'
  | 'albumSections'
  | 'completeAlbums';

/**
 * What it takes to earn a badge. Every kind reports progress as a number
 * against a required number, so the screen can draw a bar for any of them.
 */
export type AchievementCriterion =
  | { kind: 'count'; of: AchievementCount; atLeast: number }
  /** Oldest to newest year, inclusive, the same span the dashboard shows. */
  | { kind: 'yearSpan'; atLeast: number }
  /** At least one coin struck before this year. Ancient coins always count. */
  | { kind: 'coinBefore'; year: number }
  /** At least one coin filed under this category. */
  | { kind: 'category'; category: CoinCategory }
  | { kind: 'albumComplete'; albumId: AlbumId }
  /** Account created before this ISO date. */
  | { kind: 'joinedBefore'; date: string };

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  group: AchievementGroup;
  tier: AchievementTier;
  criterion: AchievementCriterion;
}

/** The coin fields achievements read. Any Coin satisfies this. */
export interface AchievementCoin {
  year: number;
  country: string | null;
  denomination: string;
  category: CoinCategory | null;
  notes: string | null;
  source?: CoinSource | null;
}

/**
 * One album's fill state. The app works this out with its album matcher and
 * passes it in, which keeps the matching rules in one place.
 */
export interface AlbumAchievementInput {
  id: AlbumId;
  filled: number;
  total: number;
  completeSections: number;
}

export interface AchievementInput {
  coins: AchievementCoin[];
  /** Checklist albums only. The World album is covered by the country badges. */
  albums: AlbumAchievementInput[];
  /** When the account was created (ISO), or null if unknown. */
  accountCreatedAt: string | null;
}

export interface AchievementProgress {
  id: string;
  current: number;
  required: number;
  /** current has reached required. */
  met: boolean;
}
