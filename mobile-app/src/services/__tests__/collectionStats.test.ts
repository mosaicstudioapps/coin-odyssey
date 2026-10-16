// src/services/__tests__/collectionStats.test.ts
import {
  buildCountryRows,
  buildMonthlySeries,
  collectedCountryCodes,
  computeDelta,
  computeMonthTicks,
  computeYearSpan,
  currencySymbol,
  formatCurrency,
  isCurrencyCode,
  recentCoins,
} from '@coin-collecting/shared';

const NOW = new Date(2026, 9, 15); // 15 Oct 2026, local time

describe('years of history', () => {
  it('spans oldest to newest, inclusive', () => {
    expect(computeYearSpan([{ year: 1870 }, { year: 2024 }, { year: 1999 }])).toEqual({ min: 1870, max: 2024, years: 155 });
  });

  it('counts a single year as one year of history', () => {
    expect(computeYearSpan([{ year: 1943 }])?.years).toBe(1);
  });

  it('ignores unknown years, and has no span without a known one', () => {
    expect(computeYearSpan([{ year: 0 }, { year: 1950 }])?.years).toBe(1);
    expect(computeYearSpan([{ year: 0 }])).toBeNull();
    expect(computeYearSpan([])).toBeNull();
  });
});

describe('countries', () => {
  it('counts aliases once and skips unknowns', () => {
    expect(collectedCountryCodes([{ country: 'Turkey' }, { country: 'Türkiye' }, { country: 'Atlantis' }])).toHaveLength(1);
  });

  it('builds map rows, most coins first, with year ranges', () => {
    const rows = buildCountryRows([
      { country: 'Canada', year: 1950 },
      { country: 'United States', year: 1999 },
      { country: 'USA', year: 1909 },
    ]);
    expect(rows[0]).toMatchObject({ coins: 2, earliest: 1909, latest: 1999 });
    expect(rows[1]).toMatchObject({ coins: 1, earliest: 1950, latest: 1950 });
  });
});

describe('recently added', () => {
  it('returns the newest first, up to the count', () => {
    const coins = [
      { id: 'a', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'b', createdAt: '2026-03-01T00:00:00Z' },
      { id: 'c', createdAt: '2026-02-01T00:00:00Z' },
    ];
    expect(recentCoins(coins, 2).map(c => c.id)).toEqual(['b', 'c']);
  });
});

describe('12-month growth', () => {
  it('labels the bookends with their year', () => {
    expect(computeMonthTicks(NOW)).toEqual(["NOV '25", 'FEB', 'MAY', 'AUG', "OCT '26"]);
  });

  it('keeps a running total by month, counting older coins from the start', () => {
    const series = buildMonthlySeries(
      [
        { createdAt: new Date(2024, 0, 1).toISOString() },
        { createdAt: new Date(2026, 8, 10).toISOString() },
        { createdAt: new Date(2026, 9, 2).toISOString() },
      ],
      NOW
    );
    expect(series).toHaveLength(12);
    expect(series[0]).toBe(1);
    expect(series[10]).toBe(2);
    expect(series[11]).toBe(3);
  });

  it('is all zeros for an empty collection', () => {
    expect(buildMonthlySeries([], NOW)).toEqual(new Array(12).fill(0));
  });

  it('reports the change across the year, or nothing when flat at zero', () => {
    expect(computeDelta([1, 1, 3])).toEqual({ abs: 2, pct: 200 });
    expect(computeDelta([0, 0])).toBeNull();
    expect(computeDelta([5])).toBeNull();
  });
});

describe('display currency', () => {
  it('changes the symbol only', () => {
    expect(formatCurrency(12.5, 'USD')).toBe('$12.50');
    expect(formatCurrency(12.5, 'EUR')).toBe('€12.50');
    expect(formatCurrency(1200, 'JPY')).toBe('¥1,200');
  });

  it('drops cents when compact and shows zero for missing amounts', () => {
    expect(formatCurrency(12.5, 'USD', { compact: true })).toBe('$13');
    expect(formatCurrency(null, 'USD')).toBe('$0.00');
  });

  it('knows its codes and symbols', () => {
    expect(isCurrencyCode('CAD')).toBe(true);
    expect(isCurrencyCode('BTC')).toBe(false);
    expect(currencySymbol('AUD')).toBe('A$');
  });
});

describe('world map geometry', () => {
  const { COUNTRY_PINS, buildMapDots, getCountryByCode } = require('@coin-collecting/shared');

  it('pins only real countries from the shared table, inside the map', () => {
    for (const [code, pin] of Object.entries(COUNTRY_PINS) as [string, { cx: number; cy: number }][]) {
      expect(getCountryByCode(code)).toBeDefined();
      expect(pin.cx).toBeGreaterThanOrEqual(0);
      expect(pin.cx).toBeLessThanOrEqual(360);
      expect(pin.cy).toBeGreaterThanOrEqual(0);
      expect(pin.cy).toBeLessThanOrEqual(180);
    }
  });

  it('draws the same dots every time', () => {
    const dots = buildMapDots(4);
    expect(dots.length).toBeGreaterThan(100);
    expect(buildMapDots(4)).toEqual(dots);
  });
});
