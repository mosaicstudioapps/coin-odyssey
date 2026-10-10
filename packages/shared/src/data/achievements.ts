import type { AchievementDefinition, AchievementGroup } from '../types/achievement';

/**
 * Coin Odyssey's first year on the stores ends here. Accounts created before
 * it earn Founding Collector; the badge then closes for good.
 */
export const FOUNDING_COLLECTOR_CUTOFF = '2027-10-06T00:00:00Z';

export const ACHIEVEMENT_GROUP_TITLES: Record<AchievementGroup, string> = {
  collection: 'Collection',
  world: 'Around the world',
  history: 'History',
  albums: 'Albums',
  curiosity: 'Curiosity',
  special: 'Special',
};

export const ACHIEVEMENT_GROUPS: readonly AchievementGroup[] = [
  'collection',
  'world',
  'history',
  'albums',
  'curiosity',
  'special',
];

/**
 * The badges, in display order within each group. Ids are stored in
 * user_achievements, so never rename one; retire it and add a new id instead.
 *
 * Nothing here measures money. The app is education first and records no
 * market values (see the no-pricing decision).
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // Collection size
  {
    id: 'coins_1',
    title: 'First Coin',
    description: 'Add your first coin',
    group: 'collection',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'coins', atLeast: 1 },
  },
  {
    id: 'coins_10',
    title: 'Getting Started',
    description: 'Collect 10 coins',
    group: 'collection',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'coins', atLeast: 10 },
  },
  {
    id: 'coins_50',
    title: 'Serious Collector',
    description: 'Collect 50 coins',
    group: 'collection',
    tier: 'silver',
    criterion: { kind: 'count', of: 'coins', atLeast: 50 },
  },
  {
    id: 'coins_100',
    title: 'Centurion',
    description: 'Collect 100 coins',
    group: 'collection',
    tier: 'gold',
    criterion: { kind: 'count', of: 'coins', atLeast: 100 },
  },
  {
    id: 'coins_500',
    title: 'Hoard',
    description: 'Collect 500 coins',
    group: 'collection',
    tier: 'platinum',
    criterion: { kind: 'count', of: 'coins', atLeast: 500 },
  },

  // Around the world
  {
    id: 'countries_5',
    title: 'Passport',
    description: 'Collect coins from 5 countries',
    group: 'world',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'countries', atLeast: 5 },
  },
  {
    id: 'countries_10',
    title: 'Globetrotter',
    description: 'Collect coins from 10 countries',
    group: 'world',
    tier: 'silver',
    criterion: { kind: 'count', of: 'countries', atLeast: 10 },
  },
  {
    id: 'countries_25',
    title: 'World Traveler',
    description: 'Collect coins from 25 countries',
    group: 'world',
    tier: 'gold',
    criterion: { kind: 'count', of: 'countries', atLeast: 25 },
  },
  {
    id: 'countries_50',
    title: 'Citizen of the World',
    description: 'Collect coins from 50 countries',
    group: 'world',
    tier: 'platinum',
    criterion: { kind: 'count', of: 'countries', atLeast: 50 },
  },

  // History
  {
    id: 'span_50',
    title: 'Half a Century',
    description: 'Cover 50 years of history, oldest coin to newest',
    group: 'history',
    tier: 'bronze',
    criterion: { kind: 'yearSpan', atLeast: 50 },
  },
  {
    id: 'span_100',
    title: 'Century',
    description: 'Cover 100 years of history, oldest coin to newest',
    group: 'history',
    tier: 'silver',
    criterion: { kind: 'yearSpan', atLeast: 100 },
  },
  {
    id: 'before_1900',
    title: 'Time Traveler',
    description: 'Collect a coin from before 1900',
    group: 'history',
    tier: 'silver',
    criterion: { kind: 'coinBefore', year: 1900 },
  },
  {
    id: 'before_1800',
    title: 'Old World',
    description: 'Collect a coin from before 1800',
    group: 'history',
    tier: 'gold',
    criterion: { kind: 'coinBefore', year: 1800 },
  },
  {
    id: 'ancient',
    title: 'Antiquarian',
    description: 'Collect an ancient coin',
    group: 'history',
    tier: 'platinum',
    criterion: { kind: 'category', category: 'ancient' },
  },

  // Albums
  {
    id: 'album_first_slot',
    title: 'Slotted In',
    description: 'Fill your first album slot',
    group: 'albums',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'albumSlots', atLeast: 1 },
  },
  {
    id: 'album_section',
    title: 'Page Turner',
    description: 'Complete a section of any album',
    group: 'albums',
    tier: 'silver',
    criterion: { kind: 'count', of: 'albumSections', atLeast: 1 },
  },
  {
    id: 'album_complete',
    title: 'Album Complete',
    description: 'Complete any album',
    group: 'albums',
    tier: 'gold',
    criterion: { kind: 'count', of: 'completeAlbums', atLeast: 1 },
  },
  {
    id: 'album_state_quarters',
    title: 'State Quarter Hero',
    description: 'Complete the 50 State Quarters album',
    group: 'albums',
    tier: 'gold',
    criterion: { kind: 'albumComplete', albumId: 'state_quarters' },
  },
  {
    id: 'album_awq',
    title: 'Women Quarter Champion',
    description: 'Complete the American Women Quarters album',
    group: 'albums',
    tier: 'gold',
    criterion: { kind: 'albumComplete', albumId: 'awq' },
  },
  {
    id: 'album_atb',
    title: 'National Parks Ranger',
    description: 'Complete the America the Beautiful album',
    group: 'albums',
    tier: 'platinum',
    criterion: { kind: 'albumComplete', albumId: 'atb_quarters' },
  },

  // Curiosity
  {
    id: 'notes_5',
    title: 'Notetaker',
    description: 'Write your own notes on 5 coins',
    group: 'curiosity',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'notedCoins', atLeast: 5 },
  },
  {
    id: 'denominations_5',
    title: 'Mixed Bag',
    description: 'Collect 5 different denominations',
    group: 'curiosity',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'denominations', atLeast: 5 },
  },
  {
    id: 'categories_3',
    title: 'Specialist',
    description: 'Collect coins from 3 categories, such as circulating, commemorative, and proof',
    group: 'curiosity',
    tier: 'silver',
    criterion: { kind: 'count', of: 'categories', atLeast: 3 },
  },

  // Special
  {
    id: 'founding_collector',
    title: 'Founding Collector',
    description: "Join in Coin Odyssey's first year",
    group: 'special',
    tier: 'gold',
    criterion: { kind: 'joinedBefore', date: FOUNDING_COLLECTOR_CUTOFF },
  },
  {
    id: 'first_scan',
    title: 'First Scan',
    description: 'Add a coin by scanning it',
    group: 'special',
    tier: 'bronze',
    criterion: { kind: 'count', of: 'scannedCoins', atLeast: 1 },
  },
];

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(achievement => achievement.id === id);
}
