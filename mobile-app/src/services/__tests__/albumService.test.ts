import { buildAlbums, EXCLUDED_SPECIFIC_COIN_ID, Album } from '@coin-collecting/shared';
import { Coin } from '../../types/coin';
import {
  computeAlbumFills,
  computeAlbumProgress,
  findCandidateCoins,
  buildSlotAssignment,
  buildSlotRemoval,
  resolveScanAlbumTag,
} from '../albumService';

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
