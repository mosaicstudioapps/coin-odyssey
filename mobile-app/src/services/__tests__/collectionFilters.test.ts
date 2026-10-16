// src/services/__tests__/collectionFilters.test.ts
//
// Pins the collection list's behavior now that mobile and web share it.
import {
  QUICK_CHIPS,
  applySort,
  chipMatches,
  collectionCountries,
  countActiveFilters,
  defaultFilters,
  defaultSort,
  filterCollection,
  gradeNumeric,
  passesFilters,
  type Coin,
} from '@coin-collecting/shared';

let n = 0;
const coin = (overrides: Partial<Coin> = {}): Coin => {
  n += 1;
  return {
    id: `c${n}`,
    name: `Coin ${n}`,
    title: '',
    year: 2000,
    denomination: 'Quarter',
    country: 'United States',
    grade: null,
    purchasePrice: null,
    createdAt: `2026-01-${String(n).padStart(2, '0')}T00:00:00Z`,
    specificCoinName: null,
    series: null,
    ...overrides,
  } as Coin;
};

describe('quick chips', () => {
  it('lists the chips in order', () => {
    expect(QUICK_CHIPS).toEqual(['All', 'Silver', 'Gold', 'Pre-1950', 'MS-60+', 'Americas']);
  });

  it('matches Pre-1950 by year', () => {
    expect(chipMatches(coin({ year: 1949 }), 'Pre-1950')).toBe(true);
    expect(chipMatches(coin({ year: 1950 }), 'Pre-1950')).toBe(false);
  });

  it('matches MS-60+ on mint-state grades only', () => {
    expect(chipMatches(coin({ grade: 'MS-63' }), 'MS-60+')).toBe(true);
    expect(chipMatches(coin({ grade: 'MS-58' }), 'MS-60+')).toBe(false);
    expect(chipMatches(coin({ grade: 'AU-58' }), 'MS-60+')).toBe(false);
  });

  it('matches Americas by country name', () => {
    expect(chipMatches(coin({ country: 'Canada' }), 'Americas')).toBe(true);
    expect(chipMatches(coin({ country: 'France' }), 'Americas')).toBe(false);
  });

  it('matches Silver and Gold by metal, not price', () => {
    // A cheap 1964 quarter is silver; an expensive clad one isn't.
    expect(chipMatches(coin({ denomination: 'Quarter', year: 1964, purchasePrice: 5 }), 'Silver')).toBe(true);
    expect(chipMatches(coin({ denomination: 'Quarter', year: 1999, purchasePrice: 500 }), 'Silver')).toBe(false);
    expect(chipMatches(coin({ name: 'American Gold Eagle', denomination: 'Fifty dollars', purchasePrice: 0 }), 'Gold')).toBe(true);
    expect(chipMatches(coin({ denomination: 'Quarter', year: 1999, purchasePrice: 999 }), 'Gold')).toBe(false);
  });
});

describe('filters', () => {
  it('reads the number out of a grade', () => {
    expect(gradeNumeric('MS-65')).toBe(65);
    expect(gradeNumeric('VF20')).toBe(20);
    expect(gradeNumeric(null)).toBeNull();
  });

  it('filters by country, years, and minimum grade', () => {
    const f = { ...defaultFilters, countries: ['Canada'], minYear: 1950, maxYear: 2000, minGrade: 40 };
    expect(passesFilters(coin({ country: 'Canada', year: 1975, grade: 'XF-45' }), f)).toBe(true);
    expect(passesFilters(coin({ country: 'Canada', year: 1940, grade: 'XF-45' }), f)).toBe(false);
    expect(passesFilters(coin({ country: 'Canada', year: 1975, grade: 'VF-30' }), f)).toBe(false);
    expect(passesFilters(coin({ country: 'Canada', year: 1975, grade: null }), f)).toBe(false);
    expect(passesFilters(coin({ country: 'Mexico', year: 1975, grade: 'XF-45' }), f)).toBe(false);
  });

  it('counts filter groups, not fields', () => {
    expect(countActiveFilters(defaultFilters)).toBe(0);
    expect(countActiveFilters({ ...defaultFilters, minYear: 1900, maxYear: 2000, countries: ['Peru'] })).toBe(2);
  });

  it('lists distinct countries, sorted', () => {
    expect(collectionCountries([coin({ country: 'Peru' }), coin({ country: 'Canada' }), coin({ country: 'Peru' })])).toEqual([
      'Canada',
      'Peru',
    ]);
  });
});

describe('sort and search', () => {
  it('sorts newest added first by default', () => {
    const a = coin();
    const b = coin();
    expect(applySort([a, b], defaultSort).map(c => c.id)).toEqual([b.id, a.id]);
  });

  it('sorts by year either way', () => {
    const old = coin({ year: 1900 });
    const recent = coin({ year: 2020 });
    expect(applySort([recent, old], { key: 'year', direction: 'asc' })[0]).toBe(old);
    expect(applySort([old, recent], { key: 'year', direction: 'desc' })[0]).toBe(recent);
  });

  it('searches names, countries, and years together with the chip and filters', () => {
    const lincoln = coin({ name: '1909 Lincoln Cent', year: 1909 });
    const quarter = coin({ name: 'Delaware Quarter', year: 1999 });
    const result = filterCollection([lincoln, quarter], {
      query: ' lincoln ',
      chip: 'All',
      filters: defaultFilters,
      sort: defaultSort,
    });
    expect(result).toEqual([lincoln]);
    expect(
      filterCollection([lincoln, quarter], { query: '', chip: 'Pre-1950', filters: defaultFilters, sort: defaultSort })
    ).toEqual([lincoln]);
  });
});
