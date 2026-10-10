// src/services/__tests__/achievements.test.ts
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GROUPS,
  AchievementCoin,
  AchievementInput,
  AlbumAchievementInput,
  FOUNDING_COLLECTOR_CUTOFF,
  evaluateAchievements,
  getAchievementById,
} from '@coin-collecting/shared';

const coin = (overrides: Partial<AchievementCoin> = {}): AchievementCoin => ({
  year: 2000,
  country: 'United States',
  denomination: 'Quarter',
  category: null,
  notes: null,
  source: null,
  ...overrides,
});

const input = (overrides: Partial<AchievementInput> = {}): AchievementInput => ({
  coins: [],
  albums: [],
  accountCreatedAt: null,
  ...overrides,
});

const album = (overrides: Partial<AlbumAchievementInput> = {}): AlbumAchievementInput => ({
  id: 'state_quarters',
  filled: 0,
  total: 50,
  completeSections: 0,
  ...overrides,
});

function progressOf(id: string, value: AchievementInput) {
  const progress = evaluateAchievements(value).find(p => p.id === id);
  if (!progress) throw new Error(`no achievement ${id}`);
  return progress;
}

describe('achievement definitions', () => {
  it('has the 25 agreed badges', () => {
    expect(ACHIEVEMENTS).toHaveLength(25);
  });

  it('uses unique ids, since ids are stored in user_achievements', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts every badge in a displayed group', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_GROUPS).toContain(achievement.group);
    }
  });

  it('measures nothing in money', () => {
    const text = ACHIEVEMENTS.map(a => `${a.title} ${a.description}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/\$|worth|value|price/);
  });

  it('looks up by id', () => {
    expect(getAchievementById('coins_1')?.title).toBe('First Coin');
    expect(getAchievementById('nope')).toBeUndefined();
  });
});

describe('evaluateAchievements', () => {
  it('reports progress for every badge, in definition order', () => {
    const progress = evaluateAchievements(input());
    expect(progress.map(p => p.id)).toEqual(ACHIEVEMENTS.map(a => a.id));
    expect(progress.every(p => !p.met)).toBe(true);
  });

  describe('collection size', () => {
    it('counts coins against each threshold', () => {
      const value = input({ coins: Array.from({ length: 10 }, () => coin()) });
      expect(progressOf('coins_1', value).met).toBe(true);
      expect(progressOf('coins_10', value).met).toBe(true);
      expect(progressOf('coins_50', value)).toEqual({ id: 'coins_50', current: 10, required: 50, met: false });
    });
  });

  describe('countries', () => {
    it('counts countries by resolved code, so aliases count once', () => {
      const value = input({
        coins: [
          coin({ country: 'Turkey' }),
          coin({ country: 'Türkiye' }),
          coin({ country: 'United States' }),
          coin({ country: 'USA' }),
          coin({ country: 'Atlantis' }),
          coin({ country: null }),
        ],
      });
      expect(progressOf('countries_5', value).current).toBe(2);
    });
  });

  describe('history', () => {
    it('spans oldest to newest inclusive, like the dashboard', () => {
      const value = input({ coins: [coin({ year: 1950 }), coin({ year: 1999 })] });
      expect(progressOf('span_50', value)).toMatchObject({ current: 50, met: true });
    });

    it('ignores unknown years in the span', () => {
      const value = input({ coins: [coin({ year: 0 }), coin({ year: 2001 })] });
      expect(progressOf('span_50', value).current).toBe(1);
    });

    it('earns Time Traveler for a coin from before 1900, not from 1900 itself', () => {
      expect(progressOf('before_1900', input({ coins: [coin({ year: 1900 })] })).met).toBe(false);
      expect(progressOf('before_1900', input({ coins: [coin({ year: 1899 })] })).met).toBe(true);
    });

    it('does not treat an unknown year as old', () => {
      expect(progressOf('before_1800', input({ coins: [coin({ year: 0 })] })).met).toBe(false);
    });

    it('counts an ancient coin as old even without a year', () => {
      const value = input({ coins: [coin({ year: 0, category: 'ancient' })] });
      expect(progressOf('ancient', value).met).toBe(true);
      expect(progressOf('before_1800', value).met).toBe(true);
      expect(progressOf('before_1900', value).met).toBe(true);
    });
  });

  describe('albums', () => {
    it('earns Slotted In from any filled slot', () => {
      const value = input({ albums: [album({ filled: 1 })] });
      expect(progressOf('album_first_slot', value).met).toBe(true);
      expect(progressOf('album_section', value).met).toBe(false);
    });

    it('adds sections and slots across albums', () => {
      const value = input({
        albums: [album({ filled: 3, completeSections: 1 }), album({ id: 'awq', filled: 2, total: 20 })],
      });
      expect(progressOf('album_first_slot', value).current).toBe(5);
      expect(progressOf('album_section', value).met).toBe(true);
    });

    it('tracks a named album as filled out of total', () => {
      const value = input({ albums: [album({ filled: 49 })] });
      expect(progressOf('album_state_quarters', value)).toMatchObject({ current: 49, required: 50, met: false });
      expect(progressOf('album_complete', value).met).toBe(false);
    });

    it('earns the named badge and Album Complete when an album fills', () => {
      const value = input({ albums: [album({ filled: 50 })] });
      expect(progressOf('album_state_quarters', value).met).toBe(true);
      expect(progressOf('album_complete', value).met).toBe(true);
    });

    it('never counts an empty album as complete', () => {
      const value = input({ albums: [album({ id: 'atb_quarters', filled: 0, total: 0 })] });
      expect(progressOf('album_atb', value).met).toBe(false);
      expect(progressOf('album_complete', value).met).toBe(false);
    });
  });

  describe('curiosity', () => {
    it('counts only notes with text in them', () => {
      const value = input({
        coins: [coin({ notes: 'From grandpa' }), coin({ notes: '   ' }), coin({ notes: null })],
      });
      expect(progressOf('notes_5', value).current).toBe(1);
    });

    it('counts denominations after normalizing their wording', () => {
      const value = input({
        coins: [
          coin({ denomination: 'Penny' }),
          coin({ denomination: 'Cent' }),
          coin({ denomination: 'Quarter' }),
          coin({ denomination: '' }),
        ],
      });
      expect(progressOf('denominations_5', value).current).toBe(2);
    });

    it('counts distinct categories and skips uncategorized coins', () => {
      const value = input({
        coins: [
          coin({ category: 'circulating' }),
          coin({ category: 'circulating' }),
          coin({ category: 'proof' }),
          coin({ category: null }),
        ],
      });
      expect(progressOf('categories_3', value).current).toBe(2);
    });
  });

  describe('special', () => {
    it('earns First Scan only from a scanned coin', () => {
      expect(progressOf('first_scan', input({ coins: [coin({ source: 'manual' })] })).met).toBe(false);
      expect(progressOf('first_scan', input({ coins: [coin({ source: null })] })).met).toBe(false);
      expect(progressOf('first_scan', input({ coins: [coin({ source: 'scan' })] })).met).toBe(true);
    });

    it('earns Founding Collector only before the cutoff', () => {
      const cutoff = Date.parse(FOUNDING_COLLECTOR_CUTOFF);
      const before = new Date(cutoff - 1000).toISOString();
      const after = new Date(cutoff).toISOString();
      expect(progressOf('founding_collector', input({ accountCreatedAt: before })).met).toBe(true);
      expect(progressOf('founding_collector', input({ accountCreatedAt: after })).met).toBe(false);
    });

    it('does not earn Founding Collector when the join date is unknown or garbled', () => {
      expect(progressOf('founding_collector', input({ accountCreatedAt: null })).met).toBe(false);
      expect(progressOf('founding_collector', input({ accountCreatedAt: 'soon' })).met).toBe(false);
    });
  });
});
