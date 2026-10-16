// src/services/__tests__/coinMetal.test.ts
import { coinMetal, metalDiscTone, metalFromComposition, type Coin } from '@coin-collecting/shared';

const us = (overrides: Partial<Coin>) =>
  ({
    name: '',
    series: null,
    specificCoinName: null,
    denomination: 'Quarter',
    country: 'United States',
    year: 2000,
    mintMark: null,
    composition: null,
    ...overrides,
  }) as Coin;

describe('metal from a scan composition', () => {
  it.each([
    ['90% Silver', 'silver'],
    ['40% Silver Clad', 'silver'],
    ['Copper-Nickel Clad', 'nickel'],
    ['Bronze', 'copper'],
    ['Copper-plated Zinc', 'copper'],
    ['Zinc Core', 'copper'],
    ['Zinc-coated Steel', 'steel'],
    ['Manganese Brass', 'brass'],
    ['.900 Gold', 'gold'],
    ['Bimetallic', 'other'],
  ])('%s is %s', (composition, metal) => {
    expect(metalFromComposition(composition)).toBe(metal);
  });

  it('has no metal without text', () => {
    expect(metalFromComposition(null)).toBeNull();
    expect(metalFromComposition('  ')).toBeNull();
  });

  it('trusts a saved composition over the rules', () => {
    // A 1965 quarter is clad by the rules, but a scan that read silver
    // (a transitional error) wins.
    expect(coinMetal(us({ year: 1965, composition: '90% Silver' }))).toBe('silver');
  });
});

describe('metal from the coin itself', () => {
  it('reads metal words and silver series names', () => {
    expect(coinMetal(us({ name: 'American Silver Eagle', denomination: 'Dollar', year: 2021 }))).toBe('silver');
    expect(coinMetal(us({ name: '1881-S Morgan Dollar', denomination: 'Dollar', year: 1881 }))).toBe('silver');
    expect(coinMetal(us({ name: 'Mercury Dime', denomination: 'Dime', year: 1940 }))).toBe('silver');
  });

  it('treats eagles as gold, unless they are silver eagles', () => {
    expect(coinMetal(us({ name: 'Liberty Head Double Eagle', denomination: 'Twenty dollars', year: 1904 }))).toBe('gold');
    expect(coinMetal(us({ name: 'American Silver Eagle', denomination: 'Dollar' }))).toBe('silver');
  });

  it('does not mistake a golden dollar for gold', () => {
    expect(coinMetal(us({ name: 'Sacagawea Golden Dollar', denomination: 'Dollar', year: 2000 }))).toBe('brass');
  });
});

describe('United States rules by year', () => {
  it('dimes and quarters are silver through 1964, clad after', () => {
    expect(coinMetal(us({ denomination: 'Dime', year: 1964 }))).toBe('silver');
    expect(coinMetal(us({ denomination: 'Dime', year: 1965 }))).toBe('nickel');
    expect(coinMetal(us({ denomination: 'Quarter', year: 1932 }))).toBe('silver');
  });

  it('halves keep 40% silver through 1970', () => {
    expect(coinMetal(us({ denomination: 'Half Dollar', year: 1968 }))).toBe('silver');
    expect(coinMetal(us({ denomination: 'Half Dollar', year: 1971 }))).toBe('nickel');
  });

  it('wartime nickels are silver, including 1942 P and S', () => {
    expect(coinMetal(us({ denomination: 'Nickel', year: 1944 }))).toBe('silver');
    expect(coinMetal(us({ denomination: 'Nickel', year: 1942, mintMark: 'P' }))).toBe('silver');
    expect(coinMetal(us({ denomination: 'Nickel', year: 1942, mintMark: 'D' }))).toBe('nickel');
    expect(coinMetal(us({ denomination: 'Nickel', year: 1946 }))).toBe('nickel');
  });

  it('cents are copper, except the 1943 steel cent', () => {
    expect(coinMetal(us({ denomination: 'Penny', year: 1909 }))).toBe('copper');
    expect(coinMetal(us({ denomination: 'Cent', year: 1943 }))).toBe('steel');
  });

  it('dollars: silver to 1935, clad 1971–1999, brass since 2000', () => {
    expect(coinMetal(us({ denomination: 'Dollar', year: 1923 }))).toBe('silver');
    expect(coinMetal(us({ denomination: 'Dollar', year: 1979 }))).toBe('nickel');
    expect(coinMetal(us({ denomination: 'Dollar', year: 2007 }))).toBe('brass');
  });

  it('does not guess without a year', () => {
    expect(coinMetal(us({ denomination: 'Quarter', year: 0 }))).toBeNull();
  });
});

describe('other countries', () => {
  it('uses only the composition or the coin’s own words', () => {
    const canada = { country: 'Canada', denomination: 'Dime', year: 1950, name: '', series: null, specificCoinName: null, mintMark: null } as unknown as Coin;
    expect(coinMetal({ ...canada, composition: null })).toBeNull();
    expect(coinMetal({ ...canada, composition: '80% Silver' })).toBe('silver');
  });
});

describe('disc colors', () => {
  it('follow the metal', () => {
    expect(metalDiscTone(us({ denomination: 'Quarter', year: 1999 }))).toBe('silver');
    expect(metalDiscTone(us({ denomination: 'Penny', year: 1970 }))).toBe('copper');
    expect(metalDiscTone(us({ denomination: 'Dollar', year: 2000 }))).toBe('gold');
    expect(metalDiscTone({ country: 'Atlantis', denomination: 'Drachma', year: 100 } as Coin)).toBe('copper');
  });
});
