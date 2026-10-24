import {
  buildAlbums,
  EXCLUDED_SPECIFIC_COIN_ID,
  MINT_MARK_NONE,
  MINT_MARK_UNKNOWN,
  Album,
} from '@coin-collecting/shared';
import { Coin } from '../../types/coin';
import {
  computeAlbumFills,
  computeAlbumProgress,
  findCandidateCoins,
  buildSlotAssignment,
  buildSlotRemoval,
  resolveScanAlbumTag,
  summarizeAlbumsForAchievements,
} from '@coin-collecting/shared';

const albums = buildAlbums(2026);
const albumById = (id: string): Album => albums.find(album => album.id === id)!;

let coinCounter = 0;
function makeCoin(overrides: Partial<Coin>): Coin {
  coinCounter += 1;
  return {
    id: `coin-${coinCounter}`,
    name: 'Test Coin',
    title: '',
    year: 2000,
    mintMark: null,
    grade: null,
    faceValue: null,
    purchasePrice: null,
    currentMarketValue: null,
    lastValueUpdate: null,
    pcgsId: null,
    createdAt: `2026-01-01T00:00:0${coinCounter % 10}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
    collectionId: 'collection-1',
    denomination: 'Quarter',
    category: null,
    purchaseDate: null,
    personalValue: null,
    lastAppraisalValue: null,
    lastAppraisalDate: null,
    mintage: null,
    rarityScale: null,
    historicalNotes: null,
    varietyNotes: null,
    notes: null,
    images: null,
    obverseImage: null,
    reverseImage: null,
    country: 'United States',
    series: null,
    seriesId: null,
    specificCoinId: null,
    specificCoinName: null,
    designer: null,
    theme: null,
    honoree: null,
    releaseDate: null,
    certificationNumber: null,
    gradingService: null,
    ...overrides,
  };
}

describe('computeAlbumFills — design matching (quarters)', () => {
  const stateQuarters = albumById('state_quarters');

  it('fills a slot from name keywords, year-gated', () => {
    const delaware = makeCoin({ name: 'Delaware Quarter', year: 1999 });
    const fills = computeAlbumFills(stateQuarters, [delaware]);
    expect(fills.get('delaware_1999')?.coin.id).toBe(delaware.id);
    expect(fills.get('delaware_1999')?.source).toBe('heuristic');
  });

  it('does not match generic names with no design evidence', () => {
    const generic = makeCoin({ name: '1999 Quarter', year: 1999 });
    expect(computeAlbumFills(stateQuarters, [generic]).size).toBe(0);
  });

  it('year gates substring collisions (Kansas vs Arkansas, Virginia vs West Virginia)', () => {
    const arkansas = makeCoin({ name: 'Arkansas Quarter', year: 2003 });
    const westVirginia = makeCoin({ name: 'West Virginia Quarter', year: 2005 });
    const fills = computeAlbumFills(stateQuarters, [arkansas, westVirginia]);
    expect(fills.get('arkansas_2003')?.coin.id).toBe(arkansas.id);
    expect(fills.get('kansas_2005')).toBeUndefined();
    expect(fills.get('west_virginia_2005')?.coin.id).toBe(westVirginia.id);
    expect(fills.get('virginia_2000')).toBeUndefined();
  });

  it('a generic "Washington Quarter" never fills the Washington state slot', () => {
    const generic = makeCoin({ name: 'Washington Quarter', year: 2007 });
    expect(computeAlbumFills(stateQuarters, [generic]).size).toBe(0);
    const real = makeCoin({ name: 'Washington State Quarter', year: 2007 });
    expect(computeAlbumFills(stateQuarters, [real]).get('washington_2007')?.coin.id).toBe(real.id);
  });

  it('matches AWQ designs from honoree text', () => {
    const awq = albumById('awq');
    const angelou = makeCoin({ name: '2022 Quarter', honoree: 'Maya Angelou', year: 2022 });
    expect(computeAlbumFills(awq, [angelou]).get('maya_angelou_2022')?.coin.id).toBe(angelou.id);
  });

  it('rejects coins gated out of the album domain', () => {
    const foreign = makeCoin({ name: 'Delaware Quarter', year: 1999, country: 'Canada' });
    const wrongDenom = makeCoin({ name: 'Delaware Quarter', year: 1999, denomination: 'Dollar' });
    const otherSeries = makeCoin({
      name: 'Delaware Quarter',
      year: 1999,
      seriesId: 'american_women_quarters',
    });
    expect(computeAlbumFills(stateQuarters, [foreign, wrongDenom, otherSeries]).size).toBe(0);
  });
});

describe('computeAlbumFills — yearMint matching (Lincoln cents)', () => {
  const wheat = albumById('lincoln_wheat');
  const shield = albumById('lincoln_shield');

  it('matches year + folded mint mark', () => {
    const d1958 = makeCoin({ name: '1958 Lincoln Cent', year: 1958, mintMark: 'd', denomination: 'Penny' });
    const p1958 = makeCoin({ name: '1958 Lincoln Cent', year: 1958, mintMark: 'P', denomination: 'Cent' });
    const fills = computeAlbumFills(wheat, [d1958, p1958]);
    expect(fills.get('lincoln_1958_d')?.coin.id).toBe(d1958.id);
    expect(fills.get('lincoln_1958')?.coin.id).toBe(p1958.id);
  });

  it('routes 1909 V.D.B. vs plain by keywords', () => {
    const vdb = makeCoin({ name: '1909 V.D.B. Lincoln Cent', year: 1909, denomination: 'Cent' });
    const plain = makeCoin({ name: '1909 Lincoln Cent', year: 1909, denomination: 'Cent' });
    const fills = computeAlbumFills(wheat, [vdb, plain]);
    expect(fills.get('lincoln_1909_vdb')?.coin.id).toBe(vdb.id);
    expect(fills.get('lincoln_1909')?.coin.id).toBe(plain.id);
  });

  it('keyword-gates the 2009 Bicentennial designs', () => {
    const logCabin = makeCoin({
      name: '2009 Lincoln Cent Log Cabin',
      year: 2009,
      denomination: 'Cent',
    });
    const plain2009 = makeCoin({ name: '2009 Lincoln Cent', year: 2009, denomination: 'Cent' });
    const fills = computeAlbumFills(shield, [logCabin, plain2009]);
    expect(fills.get('lincoln_2009_birth')?.coin.id).toBe(logCabin.id);
    expect(fills.size).toBe(1); // the unspecified 2009 stays manual
  });

  it('one coin fills at most one slot per album', () => {
    const only = makeCoin({ name: '1958 Lincoln Cent', year: 1958, denomination: 'Cent' });
    const fills = computeAlbumFills(wheat, [only]);
    expect(fills.size).toBe(1);
  });
});

describe('computeAlbumFills — precedence and sentinel', () => {
  const stateQuarters = albumById('state_quarters');

  it('explicit tags beat heuristics and unrelated text', () => {
    const tagged = makeCoin({
      name: 'Mystery Quarter',
      year: 1999,
      seriesId: 'state_quarters',
      specificCoinId: 'delaware_1999',
    });
    const heuristic = makeCoin({ name: 'Delaware Quarter', year: 1999 });
    const fills = computeAlbumFills(stateQuarters, [tagged, heuristic]);
    expect(fills.get('delaware_1999')?.coin.id).toBe(tagged.id);
    expect(fills.get('delaware_1999')?.source).toBe('explicit');
  });

  it('ranks duplicate claimants: image beats no image, then older coin', () => {
    const noImage = makeCoin({ specificCoinId: 'delaware_1999', createdAt: '2026-01-01T00:00:00.000Z' });
    const withImage = makeCoin({
      specificCoinId: 'delaware_1999',
      obverseImage: 'https://example.com/a.jpg',
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    const fills = computeAlbumFills(stateQuarters, [noImage, withImage]);
    expect(fills.get('delaware_1999')?.coin.id).toBe(withImage.id);

    const older = makeCoin({ specificCoinId: 'georgia_1999', createdAt: '2025-01-01T00:00:00.000Z' });
    const newer = makeCoin({ specificCoinId: 'georgia_1999', createdAt: '2026-01-01T00:00:00.000Z' });
    expect(computeAlbumFills(stateQuarters, [newer, older]).get('georgia_1999')?.coin.id).toBe(older.id);
  });

  it('sentinel-excluded coins never fill series slots', () => {
    const excluded = makeCoin({
      name: 'Delaware Quarter',
      year: 1999,
      specificCoinId: EXCLUDED_SPECIFIC_COIN_ID,
    });
    expect(computeAlbumFills(stateQuarters, [excluded]).size).toBe(0);
  });

  it('a coin tagged to one slot is not reused heuristically elsewhere', () => {
    const tagged = makeCoin({
      name: 'Georgia Quarter',
      year: 1999,
      seriesId: 'state_quarters',
      specificCoinId: 'delaware_1999',
    });
    const fills = computeAlbumFills(stateQuarters, [tagged]);
    expect(fills.get('delaware_1999')?.coin.id).toBe(tagged.id);
    expect(fills.get('georgia_1999')).toBeUndefined();
  });
});

describe('computeAlbumFills — world album', () => {
  const world = albumById('world');

  it('buckets by country with a representative coin and count', () => {
    const canada1 = makeCoin({ name: 'Canadian Quarter', country: 'Canada' });
    const canada2 = makeCoin({
      name: 'Canadian Dollar',
      country: 'canada',
      obverseImage: 'https://example.com/loon.jpg',
    });
    const fills = computeAlbumFills(world, [canada1, canada2]);
    const fill = fills.get('country_CA');
    expect(fill?.coinCount).toBe(2);
    expect(fill?.coin.id).toBe(canada2.id); // image-ranked representative
  });

  it('sentinel-excluded coins still count for the world album', () => {
    const excluded = makeCoin({ country: 'Japan', specificCoinId: EXCLUDED_SPECIFIC_COIN_ID });
    expect(computeAlbumFills(world, [excluded]).get('country_JP')?.coinCount).toBe(1);
  });

  it('unresolvable or missing countries fill nothing', () => {
    const mystery = makeCoin({ country: 'Atlantis' });
    const noCountry = makeCoin({ country: null });
    expect(computeAlbumFills(world, [mystery, noCountry]).size).toBe(0);
  });
});

describe('computeAlbumProgress', () => {
  it('reports filled vs total', () => {
    const stateQuarters = albumById('state_quarters');
    const delaware = makeCoin({ name: 'Delaware Quarter', year: 1999 });
    expect(computeAlbumProgress(stateQuarters, [delaware])).toEqual({ filled: 1, total: 50 });
  });
});

describe('summarizeAlbumsForAchievements', () => {
  const summary = (coins: Coin[]) => summarizeAlbumsForAchievements(albums, coins);
  const stateQuarters = (coins: Coin[]) => summary(coins).find(a => a.id === 'state_quarters')!;

  it('covers every checklist album and leaves out the World album', () => {
    const ids = summary([]).map(a => a.id);
    expect(ids).not.toContain('world');
    expect(ids).toHaveLength(albums.filter(a => a.kind === 'series').length);
  });

  it('reports filled slots against the album total', () => {
    const delaware = makeCoin({ name: 'Delaware Quarter', year: 1999 });
    expect(stateQuarters([delaware])).toEqual({
      id: 'state_quarters',
      filled: 1,
      total: 50,
      completeSections: 0,
      // Blank mint mark counts as Philadelphia, so it fills the P slot of the folder.
      mintFilled: 1,
      mintTotal: 100,
    });
  });

  it('counts the folder (P and D) only for the quarter albums', () => {
    const morgans = summarizeAlbumsForAchievements([albumById('morgan_dollars')], []);
    expect(morgans[0]).not.toHaveProperty('mintTotal');
  });

  it('counts a section once every slot in it is filled', () => {
    const section = albumById('state_quarters').sections[0];
    const coins = section.slots.map(slot => makeCoin({ specificCoinId: slot.id }));
    expect(stateQuarters(coins).completeSections).toBe(1);
    expect(stateQuarters(coins.slice(1)).completeSections).toBe(0);
  });
});

describe('findCandidateCoins', () => {
  const stateQuarters = albumById('state_quarters');
  const delawareSlot = stateQuarters.sections[0].slots[0];

  it('splits likely matches from the rest of the collection', () => {
    const likely = makeCoin({ name: 'Delaware Quarter', year: 1999 });
    const unrelated = makeCoin({ name: 'Buffalo Nickel', year: 1936, denomination: 'Nickel' });
    const result = findCandidateCoins(stateQuarters, delawareSlot, [likely, unrelated]);
    expect(result.likely.map(coin => coin.id)).toEqual([likely.id]);
    expect(result.other.map(coin => coin.id)).toEqual([unrelated.id]);
  });

  it('includes sentinel-excluded coins as likely (user is overriding)', () => {
    const excluded = makeCoin({
      name: 'Delaware Quarter',
      year: 1999,
      specificCoinId: EXCLUDED_SPECIFIC_COIN_ID,
    });
    const result = findCandidateCoins(stateQuarters, delawareSlot, [excluded]);
    expect(result.likely.map(coin => coin.id)).toEqual([excluded.id]);
  });
});

describe('assignment payloads', () => {
  it('buildSlotAssignment resolves series and specific-coin names', () => {
    const awq = albumById('awq');
    const angelouSlot = awq.sections[0].slots[0];
    expect(buildSlotAssignment(awq, angelouSlot)).toEqual({
      seriesId: 'american_women_quarters',
      specificCoinId: 'maya_angelou_2022',
      specificCoinName: 'Maya Angelou Quarter',
      series: 'American Women Quarters',
    });

    const wheat = albumById('lincoln_wheat');
    const vdbSlot = wheat.sections[0].slots.find(slot => slot.id === 'lincoln_1909_s_vdb')!;
    expect(buildSlotAssignment(wheat, vdbSlot)?.specificCoinName).toBe('1909-S V.D.B. Lincoln Cent');
  });

  it('buildSlotRemoval writes the exclusion sentinel', () => {
    expect(buildSlotRemoval()).toEqual({ specificCoinId: EXCLUDED_SPECIFIC_COIN_ID });
  });
});

describe('resolveScanAlbumTag', () => {
  it('tags an unambiguous scan', () => {
    const tag = resolveScanAlbumTag(
      {
        name: 'Delaware State Quarter',
        year: 1999,
        denomination: 'Quarter',
        country: 'United States',
      },
      albums,
    );
    expect(tag).toEqual({
      seriesId: 'state_quarters',
      specificCoinId: 'delaware_1999',
      specificCoinName: 'Delaware Quarter',
      series: '50 State Quarters Program',
    });
  });

  it('uses the design field when the name is generic', () => {
    const tag = resolveScanAlbumTag(
      {
        name: '2022 Quarter',
        design: 'Maya Angelou',
        year: 2022,
        denomination: 'Quarter',
        country: 'United States',
      },
      albums,
    );
    expect(tag?.specificCoinId).toBe('maya_angelou_2022');
  });

  it('returns null on ambiguity, missing year, or foreign coins', () => {
    const ambiguous = resolveScanAlbumTag(
      {
        name: 'Maya Angelou and Wilma Mankiller commemorative quarter',
        year: 2022,
        denomination: 'Quarter',
        country: 'United States',
      },
      albums,
    );
    expect(ambiguous).toBeNull();
    expect(resolveScanAlbumTag({ name: 'Delaware Quarter', denomination: 'Quarter' }, albums)).toBeNull();
    expect(
      resolveScanAlbumTag(
        { name: 'Delaware Quarter', year: 1999, denomination: 'Quarter', country: 'Canada' },
        albums,
      ),
    ).toBeNull();
  });

  it('tags Lincoln cents by year and mint', () => {
    const tag = resolveScanAlbumTag(
      {
        name: 'Lincoln Wheat Cent',
        year: 1943,
        mintMark: 'S',
        denomination: 'Cent',
        country: 'United States',
      },
      albums,
    );
    expect(tag?.specificCoinId).toBe('lincoln_1943_s');
    expect(tag?.seriesId).toBe('lincoln_wheat_cents');
  });
});

describe('classic silver runs — Morgan / Peace / Walking Liberty', () => {
  const morgan = albumById('morgan_dollars');
  const peace = albumById('peace_dollars');
  const walking = albumById('walking_liberty');

  it('fills a Morgan slot from year and mint mark', () => {
    const coin = makeCoin({
      name: 'Morgan Silver Dollar',
      year: 1889,
      mintMark: 'CC',
      denomination: 'Dollar',
    });
    expect(computeAlbumFills(morgan, [coin]).get('morgan_1889_cc')?.coin.id).toBe(coin.id);
  });

  it('keeps half dollars out of the dollar albums', () => {
    const half = makeCoin({ year: 1921, mintMark: 'D', denomination: 'Half Dollar' });
    expect(computeAlbumFills(morgan, [half]).size).toBe(0);
    expect(computeAlbumFills(walking, [half]).get('walking_liberty_1921_d')?.coin.id).toBe(half.id);
  });

  it('routes 1921 dollars to the right album by name', () => {
    const morganCoin = makeCoin({ name: 'Morgan Dollar', year: 1921, denomination: 'Dollar' });
    const peaceCoin = makeCoin({ name: 'Peace Dollar', year: 1921, denomination: 'Dollar' });

    const morganFills = computeAlbumFills(morgan, [morganCoin, peaceCoin]);
    expect(morganFills.get('morgan_1921')?.coin.id).toBe(morganCoin.id);

    const peaceFills = computeAlbumFills(peace, [morganCoin, peaceCoin]);
    expect(peaceFills.get('peace_1921')?.coin.id).toBe(peaceCoin.id);
  });

  it('leaves a generic 1921 silver dollar unassigned in both albums', () => {
    const generic = makeCoin({ name: 'Silver Dollar', year: 1921, denomination: 'Dollar' });
    expect(computeAlbumFills(morgan, [generic]).has('morgan_1921')).toBe(false);
    expect(computeAlbumFills(peace, [generic]).has('peace_1921')).toBe(false);
    // ...but it is still offered as a manual candidate on both slots.
    const slot = morgan.sections
      .flatMap(section => section.slots)
      .find(s => s.id === 'morgan_1921')!;
    expect(findCandidateCoins(morgan, slot, [generic]).other).toContainEqual(generic);
  });

  it('does not tag ambiguous 1921 dollars from a scan', () => {
    expect(
      resolveScanAlbumTag(
        { name: 'Silver Dollar', year: 1921, denomination: 'Dollar', country: 'United States' },
        albums,
      ),
    ).toBeNull();
    expect(
      resolveScanAlbumTag(
        {
          name: 'Peace Dollar',
          design: 'Peace',
          year: 1921,
          denomination: 'Dollar',
          country: 'United States',
        },
        albums,
      )?.specificCoinId,
    ).toBe('peace_1921');
  });

  it('fills an America the Beautiful slot by site keyword', () => {
    const atb = albumById('atb_quarters');
    const coin = makeCoin({ name: 'Acadia National Park Quarter', year: 2012 });
    expect(computeAlbumFills(atb, [coin]).get('acadia_2012')?.coin.id).toBe(coin.id);
  });

  it('does not let a state name leak across the quarter albums', () => {
    const atb = albumById('atb_quarters');
    const stateQuarters = albumById('state_quarters');
    const delaware1999 = makeCoin({ name: 'Delaware Quarter', year: 1999 });
    // Bombay Hook (2015) is the Delaware ATB site; the 1999 coin must not fill it.
    expect(computeAlbumFills(atb, [delaware1999]).size).toBe(0);
    expect(computeAlbumFills(stateQuarters, [delaware1999]).size).toBe(1);
  });
});

describe('denomination gate — category values in the denomination field', () => {
  const stateQuarters = albumById('state_quarters');
  const wheat = albumById('lincoln_wheat');
  const shield = albumById('lincoln_shield');

  it('fills design slots for coins filed under a category, not a denomination', () => {
    // Real shape of imported data: the denomination field holds "Commemorative"
    // and the descriptive text carries year, state and mint mark.
    const georgia = makeCoin({
      denomination: 'Commemorative',
      year: 1999,
      mintMark: 'D',
      title: '25 cent 1999 "Georgia" D',
      name: null as unknown as string,
    });
    expect(computeAlbumFills(stateQuarters, [georgia]).get('georgia_1999')?.coin.id).toBe(
      georgia.id,
    );
  });

  it('accepts other unrecognized denomination text', () => {
    for (const denomination of ['Regular issue', 'Bullion', '', 'Morgan Dollar']) {
      const coin = makeCoin({ denomination, year: 2000, title: '25 cent 2000 Maryland D' });
      expect(computeAlbumFills(stateQuarters, [coin]).size).toBe(1);
    }
  });

  it('still rejects a recognized denomination that belongs elsewhere', () => {
    const cent = makeCoin({ denomination: 'Cent', year: 1999, title: '1 cent 1999 Georgia' });
    expect(computeAlbumFills(stateQuarters, [cent]).size).toBe(0);
  });

  it('does not let unknown denominations into date/mint albums', () => {
    // The regression this guards: year + mint mark alone is the whole test on
    // most date/mint slots, so a bullion round would otherwise fill a cent slot.
    const bullion = makeCoin({
      denomination: 'Bullion',
      year: 2013,
      mintMark: null,
      title: '1 dollar 2013 "Walking Liberty"',
    });
    expect(computeAlbumFills(shield, [bullion]).size).toBe(0);

    const vagueCent = makeCoin({ denomination: 'Lincoln Cent', year: 1943, mintMark: 'S' });
    expect(computeAlbumFills(wheat, [vagueCent]).size).toBe(0);
  });

  it('keeps the country gate intact regardless of denomination', () => {
    const foreign = makeCoin({
      denomination: 'Commemorative',
      year: 1999,
      country: 'Canada',
      title: '25 cent 1999 "Georgia" D',
    });
    expect(computeAlbumFills(stateQuarters, [foreign]).size).toBe(0);
  });

  it('does not tag scans from an unknown denomination on a date/mint slot', () => {
    expect(
      resolveScanAlbumTag(
        { name: 'Lincoln Wheat Cent', year: 1943, mintMark: 'S', denomination: 'Bullion' },
        albums,
      ),
    ).toBeNull();
  });
});

describe('mint mark sentinels in album matching', () => {
  const wheat = albumById('lincoln_wheat');

  it('fills the Philadelphia slot from an explicit "no mint mark"', () => {
    const coin = makeCoin({
      name: '1944 Lincoln Cent',
      year: 1944,
      mintMark: MINT_MARK_NONE,
      denomination: 'Cent',
    });
    expect(computeAlbumFills(wheat, [coin]).get('lincoln_1944')?.coin.id).toBe(coin.id);
  });

  it('leaves an unexamined coin out of every date/mint slot', () => {
    const coin = makeCoin({
      name: '1944 Lincoln Cent',
      year: 1944,
      mintMark: MINT_MARK_UNKNOWN,
      denomination: 'Cent',
    });
    // It must not quietly claim Philadelphia just because no letter was read.
    expect(computeAlbumFills(wheat, [coin]).size).toBe(0);
  });

  it('still offers the unexamined coin for manual assignment', () => {
    const coin = makeCoin({
      name: '1944 Lincoln Cent',
      year: 1944,
      mintMark: MINT_MARK_UNKNOWN,
      denomination: 'Cent',
    });
    const slot = wheat.sections.flatMap(s => s.slots).find(s => s.id === 'lincoln_1944')!;
    const { likely, other } = findCandidateCoins(wheat, slot, [coin]);
    expect(likely).toHaveLength(0);
    expect(other.map(c => c.id)).toContain(coin.id);
  });

  it('leaves legacy blank mint marks matching Philadelphia', () => {
    // Pre-sentinel rows had no way to say "no mint mark", so blank stays
    // lenient — tightening it would empty albums for every existing collector.
    const coin = makeCoin({
      name: '1944 Lincoln Cent',
      year: 1944,
      mintMark: null,
      denomination: 'Cent',
    });
    expect(computeAlbumFills(wheat, [coin]).get('lincoln_1944')?.coin.id).toBe(coin.id);
  });

  it('does not tag a scan whose mint mark could not be read', () => {
    expect(
      resolveScanAlbumTag(
        { name: 'Cent', year: 1944, mintMark: MINT_MARK_UNKNOWN, denomination: 'Cent' },
        albums,
      ),
    ).toBeNull();
    expect(
      resolveScanAlbumTag(
        { name: 'Cent', year: 1944, mintMark: MINT_MARK_NONE, denomination: 'Cent' },
        albums,
      )?.specificCoinId,
    ).toBe('lincoln_1944');
  });
});

describe('mint view (P and D folder slots)', () => {
  const { albumInView } = require('@coin-collecting/shared');
  const designView = albumById('state_quarters');
  const mintView: Album = albumInView(designView, 'mint');

  it('doubles the three quarter albums and leaves the rest alone', () => {
    expect(mintView.totalSlots).toBe(100);
    expect(albumInView(albumById('atb_quarters'), 'mint').totalSlots).toBe(112);
    expect(albumInView(albumById('awq'), 'mint').totalSlots).toBe(40);
    expect(albumInView(albumById('morgan_dollars'), 'mint')).toBe(albumById('morgan_dollars'));
    expect(albumInView(designView, 'design')).toBe(designView);
    const [p, d] = mintView.sections[0].slots;
    expect([p.id, p.sublabel, p.designId]).toEqual(['delaware_1999__P', 'P', 'delaware_1999']);
    expect(d.id).toBe('delaware_1999__D');
  });

  it('sorts coins into P and D by mint mark; blank counts as Philadelphia', () => {
    const den = makeCoin({ name: 'Delaware Quarter', year: 1999, mintMark: 'D' });
    const phl = makeCoin({ name: 'Delaware Quarter', year: 1999, mintMark: null });
    const fills = computeAlbumFills(mintView, [den, phl]);
    expect(fills.get('delaware_1999__D')?.coin.id).toBe(den.id);
    expect(fills.get('delaware_1999__P')?.coin.id).toBe(phl.id);
    // The design view still counts the design once.
    expect(computeAlbumFills(designView, [den, phl]).has('delaware_1999')).toBe(true);
  });

  it('places a design-tagged coin by its mint, and leaves "Not sure" out', () => {
    const tagged = makeCoin({ year: 1999, mintMark: 'D', seriesId: 'state_quarters', specificCoinId: 'delaware_1999' });
    const unsure = makeCoin({ year: 1999, mintMark: MINT_MARK_UNKNOWN, seriesId: 'state_quarters', specificCoinId: 'pennsylvania_1999' });
    const fills = computeAlbumFills(mintView, [tagged, unsure]);
    expect(fills.get('delaware_1999__D')).toMatchObject({ source: 'explicit' });
    expect(fills.has('delaware_1999__P')).toBe(false);
    expect(fills.has('pennsylvania_1999__P') || fills.has('pennsylvania_1999__D')).toBe(false);
    expect(computeAlbumFills(designView, [unsure]).has('pennsylvania_1999')).toBe(true);
  });

  it('assigns with the design tag and the slot mint', () => {
    const [p, d] = mintView.sections[0].slots;
    expect(buildSlotAssignment(mintView, d)).toMatchObject({ specificCoinId: 'delaware_1999', mintMark: 'D' });
    expect(buildSlotAssignment(mintView, p)).toMatchObject({ specificCoinId: 'delaware_1999', mintMark: 'P' });
    expect(buildSlotAssignment(designView, designView.sections[0].slots[0])).not.toHaveProperty('mintMark');
  });

  it('suggests only coins of the slot mint as likely', () => {
    const den = makeCoin({ name: 'Delaware Quarter', year: 1999, mintMark: 'D' });
    const [p, d] = mintView.sections[0].slots;
    expect(findCandidateCoins(mintView, d, [den]).likely).toHaveLength(1);
    expect(findCandidateCoins(mintView, p, [den]).likely).toHaveLength(0);
  });
});

describe('1.2 albums: where series overlap', () => {
  const fills = (albumId: string, coins: Coin[]) => computeAlbumFills(albumById(albumId), coins);

  it('keeps a plain 1938-D nickel out of both nickel albums, but files a named one', () => {
    const plain = makeCoin({ name: '1938-D Nickel', year: 1938, mintMark: 'D', denomination: 'Nickel' });
    expect(fills('buffalo_nickels', [plain]).has('buffalo_1938_d')).toBe(false);
    expect(fills('jefferson_nickels', [plain]).has('jefferson_1938_d')).toBe(false);
    const buffalo = makeCoin({ name: '1938-D Buffalo Nickel', year: 1938, mintMark: 'D', denomination: 'Nickel' });
    const jefferson = makeCoin({ name: '1938-D Jefferson Nickel', year: 1938, mintMark: 'D', denomination: 'Nickel' });
    expect(fills('buffalo_nickels', [buffalo, jefferson]).get('buffalo_1938_d')?.coin.id).toBe(buffalo.id);
    expect(fills('jefferson_nickels', [buffalo, jefferson]).get('jefferson_1938_d')?.coin.id).toBe(jefferson.id);
  });

  it('tells the regular 1942 nickel from the silver 1942-P', () => {
    const regular = makeCoin({ name: '1942 Jefferson Nickel', year: 1942, denomination: 'Nickel' });
    const silver = makeCoin({ name: '1942-P Silver War Nickel', year: 1942, mintMark: 'P', denomination: 'Nickel' });
    const result = fills('jefferson_nickels', [regular, silver]);
    expect(result.get('jefferson_1942')?.coin.id).toBe(regular.id);
    expect(result.get('jefferson_1942_p_silver')?.coin.id).toBe(silver.id);
  });

  it('needs "Mercury" for a 1916 dime, since Barber dimes share the year', () => {
    const plain = makeCoin({ name: '1916 Dime', year: 1916, denomination: 'Dime' });
    expect(fills('mercury_dimes', [plain]).has('mercury_1916')).toBe(false);
    expect(fills('mercury_dimes', [makeCoin({ name: '1916 Mercury Dime', year: 1916, denomination: 'Dime' })]).has('mercury_1916')).toBe(true);
  });

  it('files a Presidential dollar by name, and never a nickel or half with the same name', () => {
    const lincoln = makeCoin({ name: '2010 Abraham Lincoln Presidential Dollar', year: 2010, denomination: 'Dollar' });
    const kennedyHalf = makeCoin({ name: '2015 Kennedy Half Dollar', year: 2015, denomination: 'Half Dollar' });
    const result = fills('presidential_dollars', [lincoln, kennedyHalf]);
    expect(result.get('presidential_lincoln_2010')?.coin.id).toBe(lincoln.id);
    expect(result.has('presidential_kennedy_2015')).toBe(false);
  });

  it('needs the Native American series named, since Presidential dollars share the years', () => {
    const plain = makeCoin({ name: '2010 Dollar', year: 2010, mintMark: 'P', denomination: 'Dollar' });
    const named = makeCoin({ name: '2022 Ely S. Parker Dollar', year: 2022, mintMark: 'D', denomination: 'Dollar' });
    const result = fills('native_american_dollars', [plain, named]);
    expect(result.has('sacagawea_2010_p')).toBe(false);
    expect(result.get('sacagawea_2022_d')?.coin.id).toBe(named.id);
  });

  it('dates P-mark Philadelphia coins with the P', () => {
    const slot = albumById('roosevelt_dimes').sections.flatMap(s => s.slots).find(s => s.id === 'roosevelt_1999');
    expect(slot?.label).toBe('1999-P');
  });
});
