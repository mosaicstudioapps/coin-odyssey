import {
  buildAlbums,
  getAlbumById,
  LINCOLN_WHEAT_CENTS,
  LINCOLN_MEMORIAL_CENTS,
  buildShieldCents,
  STATE_QUARTERS,
  WORLD_COUNTRIES,
  resolveCountryCode,
  normalizeText,
  normalizeCountry,
  normalizeDenomination,
  normalizeMintMark,
  canonicalizeMintMark,
  formatMintMark,
  isMintMarkAnswered,
  mintMarkLetter,
  MINT_MARK_NONE,
  MINT_MARK_UNKNOWN,
  UNKNOWN_MINT_MARK,
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

describe('mint mark sentinels', () => {
  it('folds "no mint mark" in with Philadelphia', () => {
    expect(normalizeMintMark(MINT_MARK_NONE)).toBe('');
    expect(normalizeMintMark('none')).toBe('');
  });

  it('keeps an unknown mark out of every slot', () => {
    expect(normalizeMintMark(MINT_MARK_UNKNOWN)).toBe(UNKNOWN_MINT_MARK);
    // No generated slot may claim the unknown token, or unexamined coins
    // would auto-fill it.
    const slotMarks = buildAlbums(2026)
      .flatMap(album => album.sections)
      .flatMap(section => section.slots)
      .map(slot => (slot.match.kind === 'yearMint' ? slot.match.mintMark : null));
    expect(slotMarks).not.toContain(UNKNOWN_MINT_MARK);
  });

  it('distinguishes answered from unanswered', () => {
    expect(isMintMarkAnswered(null)).toBe(false);
    expect(isMintMarkAnswered('  ')).toBe(false);
    expect(isMintMarkAnswered(MINT_MARK_NONE)).toBe(true);
    expect(isMintMarkAnswered(MINT_MARK_UNKNOWN)).toBe(true);
    expect(isMintMarkAnswered('D')).toBe(true);
  });

  it('shows sentinels in words but only real letters in compact lines', () => {
    expect(formatMintMark(MINT_MARK_NONE)).toBe('No mint mark');
    expect(formatMintMark(MINT_MARK_UNKNOWN)).toBe('Unknown');
    expect(formatMintMark('d')).toBe('D');
    expect(formatMintMark(null)).toBeNull();

    expect(mintMarkLetter(MINT_MARK_NONE)).toBeNull();
    expect(mintMarkLetter(MINT_MARK_UNKNOWN)).toBeNull();
    expect(mintMarkLetter(null)).toBeNull();
    expect(mintMarkLetter('cc')).toBe('CC');
  });

  it('canonicalizes recognizer output, leaving version-skewed nulls unanswered', () => {
    expect(canonicalizeMintMark('NONE')).toBe(MINT_MARK_NONE);
    expect(canonicalizeMintMark('no mint mark')).toBe(MINT_MARK_NONE);
    expect(canonicalizeMintMark('Unknown')).toBe(MINT_MARK_UNKNOWN);
    expect(canonicalizeMintMark('not visible')).toBe(MINT_MARK_UNKNOWN);
    expect(canonicalizeMintMark('d')).toBe('D');
    // An older recognize-coin deployment returns null for both "no mark" and
    // "couldn't tell". Guessing either way would be worse than leaving it blank.
    expect(canonicalizeMintMark(null)).toBeNull();
    expect(canonicalizeMintMark('')).toBeNull();
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

  it('builds the six v1.0 albums with correct slot totals', () => {
    expect(albums.map(album => album.id)).toEqual([
      'awq',
      'state_quarters',
      'lincoln_wheat',
      'lincoln_memorial',
      'lincoln_shield',
      'world',
    ]);
    const byId = Object.fromEntries(albums.map(album => [album.id, album.totalSlots]));
    expect(byId.awq).toBe(20);
    expect(byId.state_quarters).toBe(50);
    expect(byId.lincoln_wheat).toBe(140);
    expect(byId.lincoln_memorial).toBe(104);
    expect(byId.lincoln_shield).toBe(42);
    expect(byId.world).toBe(WORLD_COUNTRIES.length);
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
