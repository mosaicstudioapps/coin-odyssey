import {
  buildAlbums,
  getAlbumById,
  LINCOLN_WHEAT_CENTS,
  LINCOLN_MEMORIAL_CENTS,
  buildShieldCents,
  STATE_QUARTERS,
  ATB_QUARTERS,
  MORGAN_DOLLARS,
  PEACE_DOLLARS,
  WALKING_LIBERTY_HALVES,
  WORLD_COUNTRIES,
  resolveCountryCode,
  normalizeText,
  normalizeCountry,
  normalizeDenomination,
  normalizeMintMark,
  COIN_SERIES,
} from '@coin-collecting/shared';

describe('normalize', () => {
  it('strips diacritics and punctuation', () => {
    expect(normalizeText('Jovita Idár')).toBe('jovita idar');
    expect(normalizeText('V.D.B.')).toBe('vdb');
    expect(normalizeText('Zitkala-Ša')).toBe('zitkala sa');
    expect(normalizeText("Côte d'Ivoire")).toBe('cote divoire');
  });

  it('folds country variants', () => {
    expect(normalizeCountry('The Netherlands')).toBe('netherlands');
    expect(normalizeCountry('Türkiye')).toBe('turkiye');
  });

  it('canonicalizes denominations', () => {
    expect(normalizeDenomination('Penny')).toBe('cent');
    expect(normalizeDenomination('25 cents')).toBe('quarter');
    expect(normalizeDenomination('Quarter Dollar')).toBe('quarter');
    expect(normalizeDenomination('$0.25')).toBe('quarter');
  });

  it('folds P and empty mint marks together', () => {
    expect(normalizeMintMark(null)).toBe('');
    expect(normalizeMintMark('')).toBe('');
    expect(normalizeMintMark('P')).toBe('');
    expect(normalizeMintMark('p')).toBe('');
    expect(normalizeMintMark('d')).toBe('D');
  });
});

describe('Lincoln cent slot generation', () => {
  const wheatIds = new Set(LINCOLN_WHEAT_CENTS.map(def => def.id));
  const memorialIds = new Set(LINCOLN_MEMORIAL_CENTS.map(def => def.id));

  it('pins the volume counts (140 / 104 / 42)', () => {
    expect(LINCOLN_WHEAT_CENTS).toHaveLength(140);
    expect(LINCOLN_MEMORIAL_CENTS).toHaveLength(104);
    expect(buildShieldCents(2026)).toHaveLength(42);
  });

  it('includes the 1909 V.D.B. splits', () => {
    expect(wheatIds.has('lincoln_1909_vdb')).toBe(true);
    expect(wheatIds.has('lincoln_1909')).toBe(true);
    expect(wheatIds.has('lincoln_1909_s_vdb')).toBe(true);
    expect(wheatIds.has('lincoln_1909_s')).toBe(true);
    expect(wheatIds.has('lincoln_1909_d')).toBe(false);
  });

  it('omits the years each mint did not strike', () => {
    expect(wheatIds.has('lincoln_1922')).toBe(false); // Denver-only year
    expect(wheatIds.has('lincoln_1922_d')).toBe(true);
    expect(wheatIds.has('lincoln_1921_d')).toBe(false);
    expect(wheatIds.has('lincoln_1923_d')).toBe(false);
    expect(wheatIds.has('lincoln_1932_s')).toBe(false);
    expect(wheatIds.has('lincoln_1933_s')).toBe(false);
    expect(wheatIds.has('lincoln_1934_s')).toBe(false);
    expect(wheatIds.has('lincoln_1931_s')).toBe(true);
    expect(wheatIds.has('lincoln_1935_s')).toBe(true);
    expect(memorialIds.has('lincoln_1965_d')).toBe(false);
    expect(memorialIds.has('lincoln_1966_d')).toBe(false);
    expect(memorialIds.has('lincoln_1967_d')).toBe(false);
    expect(memorialIds.has('lincoln_1975_s')).toBe(false); // S proof-only after 1974
    expect(memorialIds.has('lincoln_1974_s')).toBe(true);
  });

  it('labels 2017 Philadelphia as "2017 P" but matches it as no-mark', () => {
    const slot2017 = buildShieldCents(2026).find(def => def.id === 'lincoln_2017');
    expect(slot2017?.name).toBe('2017 P');
    expect(slot2017?.mintMark).toBe('');
  });

  it('registers the three volumes as coin series', () => {
    for (const id of ['lincoln_wheat_cents', 'lincoln_memorial_cents', 'lincoln_shield_cents']) {
      expect(COIN_SERIES.find(series => series.id === id)).toBeDefined();
    }
  });
});

describe('state quarters data', () => {
  it('has all 50 states, five per year', () => {
    expect(STATE_QUARTERS).toHaveLength(50);
    for (let year = 1999; year <= 2008; year++) {
      expect(STATE_QUARTERS.filter(def => def.year === year)).toHaveLength(5);
    }
  });

  it('never uses bare "washington" as a keyword', () => {
    const washington = STATE_QUARTERS.find(def => def.id === 'washington_2007');
    expect(washington).toBeDefined();
    expect(washington!.keywords).not.toContain('washington');
  });
});

describe('America the Beautiful quarters data', () => {
  const ids = new Set(ATB_QUARTERS.map(def => def.id));

  it('has 56 designs: five a year 2010-2020, one in 2021', () => {
    expect(ATB_QUARTERS).toHaveLength(56);
    for (let year = 2010; year <= 2020; year++) {
      expect(ATB_QUARTERS.filter(def => def.year === year)).toHaveLength(5);
    }
    expect(ATB_QUARTERS.filter(def => def.year === 2021)).toHaveLength(1);
  });

  it('keeps the slot ids the stubbed 2010 entries already used', () => {
    for (const id of [
      'hot_springs_2010',
      'yellowstone_2010',
      'yosemite_2010',
      'grand_canyon_2010',
      'mount_hood_2010',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('never uses bare "washington" as a keyword', () => {
    for (const def of ATB_QUARTERS) {
      expect(def.keywords).not.toContain('washington');
    }
    // Olympic is the Washington site; it keeps a disambiguated keyword instead.
    const olympic = ATB_QUARTERS.find(def => def.id === 'olympic_2011');
    expect(olympic!.keywords).toContain('washington state');
  });

  it('has normalized, non-empty keywords', () => {
    for (const def of ATB_QUARTERS) {
      expect(def.keywords.length).toBeGreaterThan(0);
      for (const keyword of def.keywords) {
        expect(keyword).toBe(normalizeText(keyword));
      }
    }
  });
});

describe('Morgan dollar data', () => {
  const ids = new Set(MORGAN_DOLLARS.map(def => def.id));

  it('pins the 96 business-strike date/mint combinations', () => {
    expect(MORGAN_DOLLARS).toHaveLength(96);
  });

  it('omits the years Carson City and New Orleans did not strike', () => {
    // Carson City was shut 1886-1888 and closed for good after 1893.
    expect(ids.has('morgan_1885_cc')).toBe(true);
    expect(ids.has('morgan_1886_cc')).toBe(false);
    expect(ids.has('morgan_1887_cc')).toBe(false);
    expect(ids.has('morgan_1888_cc')).toBe(false);
    expect(ids.has('morgan_1889_cc')).toBe(true);
    expect(ids.has('morgan_1893_cc')).toBe(true);
    expect(ids.has('morgan_1894_cc')).toBe(false);
    // New Orleans started in 1879.
    expect(ids.has('morgan_1878_o')).toBe(false);
    expect(ids.has('morgan_1879_o')).toBe(true);
  });

  it('covers the 1921 revival at all three mints', () => {
    expect(ids.has('morgan_1921')).toBe(true);
    expect(ids.has('morgan_1921_d')).toBe(true);
    expect(ids.has('morgan_1921_s')).toBe(true);
    // Denver struck Morgans in 1921 only.
    expect(ids.has('morgan_1920_d')).toBe(false);
    // Nothing between 1904 and 1921.
    expect(ids.has('morgan_1905')).toBe(false);
  });

  it('keeps a flagged slot for the proof-only 1895 Philadelphia', () => {
    const key = MORGAN_DOLLARS.find(def => def.id === 'morgan_1895');
    expect(key?.sublabel).toBe('Proof only');
  });
});

describe('Peace dollar data', () => {
  const ids = new Set(PEACE_DOLLARS.map(def => def.id));

  it('pins the 24 date/mint combinations', () => {
    expect(PEACE_DOLLARS).toHaveLength(24);
  });

  it('omits the 1929-1933 gap and the Denver years that were never struck', () => {
    for (let year = 1929; year <= 1933; year++) {
      expect(PEACE_DOLLARS.some(def => def.year === year)).toBe(false);
    }
    expect(ids.has('peace_1924_d')).toBe(false);
    expect(ids.has('peace_1925_d')).toBe(false);
    expect(ids.has('peace_1928_d')).toBe(false);
    expect(ids.has('peace_1935_d')).toBe(false);
    expect(ids.has('peace_1934_d')).toBe(true);
    expect(ids.has('peace_1935_s')).toBe(true);
  });

  it('gates the 1921 slot against the Morgan dollar of the same year', () => {
    const peace1921 = PEACE_DOLLARS.find(def => def.id === 'peace_1921');
    const morgan1921 = MORGAN_DOLLARS.find(def => def.id === 'morgan_1921');
    expect(peace1921?.keywords).toContain('peace');
    expect(morgan1921?.keywords).toContain('morgan');
  });
});

describe('Walking Liberty half dollar data', () => {
  const ids = new Set(WALKING_LIBERTY_HALVES.map(def => def.id));

  it('pins the 63 date/mint combinations (varieties excluded)', () => {
    expect(WALKING_LIBERTY_HALVES).toHaveLength(63);
  });

  it('reflects the sparse 1923-1933 years', () => {
    expect(ids.has('walking_liberty_1923_s')).toBe(true);
    expect(ids.has('walking_liberty_1923')).toBe(false);
    expect(ids.has('walking_liberty_1929_s')).toBe(true);
    expect(ids.has('walking_liberty_1929_d')).toBe(true);
    expect(ids.has('walking_liberty_1929')).toBe(false);
    expect(ids.has('walking_liberty_1933_s')).toBe(true);
    for (const year of [1922, 1924, 1925, 1926, 1930, 1931, 1932]) {
      expect(WALKING_LIBERTY_HALVES.some(def => def.year === year)).toBe(false);
    }
  });

  it('omits the single-mint gaps in the 1938-1947 run', () => {
    expect(ids.has('walking_liberty_1938_s')).toBe(false);
    expect(ids.has('walking_liberty_1938_d')).toBe(true);
    expect(ids.has('walking_liberty_1940_d')).toBe(false);
    expect(ids.has('walking_liberty_1940_s')).toBe(true);
    expect(ids.has('walking_liberty_1947_s')).toBe(false);
    expect(ids.has('walking_liberty_1947_d')).toBe(true);
  });
});

describe('world countries data', () => {
  it('has no duplicate normalized names or aliases', () => {
    const seen = new Map<string, string>();
    for (const country of WORLD_COUNTRIES) {
      for (const key of [country.name, ...(country.aliases ?? [])]) {
        const normalized = normalizeCountry(key);
        expect(normalized).not.toBe('');
        const owner = seen.get(normalized);
        expect(owner ?? country.code).toBe(country.code);
        seen.set(normalized, country.code);
      }
    }
  });

  it('resolves aliases, historical names, and diacritics', () => {
    expect(resolveCountryCode('USA')).toBe('US');
    expect(resolveCountryCode('U.S.A.')).toBe('US');
    expect(resolveCountryCode('West Germany')).toBe('DE');
    expect(resolveCountryCode('USSR')).toBe('RU');
    expect(resolveCountryCode('Türkiye')).toBe('TR');
    expect(resolveCountryCode('Ceylon')).toBe('LK');
    expect(resolveCountryCode('The Netherlands')).toBe('NL');
    expect(resolveCountryCode("Côte d'Ivoire")).toBe('CI');
    expect(resolveCountryCode('Ivory Coast')).toBe('CI');
    expect(resolveCountryCode('Atlantis')).toBeNull();
    expect(resolveCountryCode(null)).toBeNull();
  });
});

describe('buildAlbums', () => {
  const albums = buildAlbums(2026);

  it('builds the ten albums with correct slot totals', () => {
    expect(albums.map(album => album.id)).toEqual([
      'awq',
      'state_quarters',
      'atb_quarters',
      'lincoln_wheat',
      'lincoln_memorial',
      'lincoln_shield',
      'morgan_dollars',
      'peace_dollars',
      'walking_liberty',
      'world',
    ]);
    const byId = Object.fromEntries(albums.map(album => [album.id, album.totalSlots]));
    expect(byId.awq).toBe(20);
    expect(byId.state_quarters).toBe(50);
    expect(byId.atb_quarters).toBe(56);
    expect(byId.lincoln_wheat).toBe(140);
    expect(byId.lincoln_memorial).toBe(104);
    expect(byId.lincoln_shield).toBe(42);
    expect(byId.morgan_dollars).toBe(96);
    expect(byId.peace_dollars).toBe(24);
    expect(byId.walking_liberty).toBe(63);
    expect(byId.world).toBe(WORLD_COUNTRIES.length);
  });

  it('gives every album a unique id and every slot a unique id within it', () => {
    expect(new Set(albums.map(album => album.id)).size).toBe(albums.length);
    for (const album of albums) {
      const slotIds = album.sections.flatMap(section => section.slots.map(slot => slot.id));
      expect(new Set(slotIds).size).toBe(slotIds.length);
    }
  });

  it('totalSlots always equals the sum of section slots', () => {
    for (const album of albums) {
      const sum = album.sections.reduce((acc, section) => acc + section.slots.length, 0);
      expect(album.totalSlots).toBe(sum);
    }
  });

  it('getAlbumById finds albums', () => {
    expect(getAlbumById('lincoln_wheat', 2026)?.title).toContain('Wheat');
    expect(getAlbumById('nope', 2026)).toBeUndefined();
  });

  it('every series-album slot id exists in its registered series', () => {
    for (const album of albums) {
      if (album.kind !== 'series' || !album.seriesId) continue;
      const series = COIN_SERIES.find(s => s.id === album.seriesId);
      expect(series).toBeDefined();
      const coinIds = new Set(series!.specificCoins.map(coin => coin.id));
      for (const section of album.sections) {
        for (const slot of section.slots) {
          expect(coinIds.has(slot.id)).toBe(true);
        }
      }
    }
  });
});
