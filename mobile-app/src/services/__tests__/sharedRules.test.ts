// src/services/__tests__/sharedRules.test.ts
//
// Row mapping, signed photo URLs, story rules, and scan rules: the shared
// pieces both apps' coin, story, and scan services stand on.
import {
  MAX_SCAN_BASE64_BYTES,
  PipelineError,
  RecognitionError,
  SCAN_COMPRESSION_LADDER,
  StoryError,
  coinFromRow,
  coinToRow,
  createSignedUrlCache,
  hasEnoughStoryDetail,
  isAuthError,
  isNetworkError,
  isStoragePath,
  perImageScanBudget,
  shortIdentityLine,
  storyInputFromCoin,
  storyRequestBody,
  type CoinRecognitionResult,
} from '@coin-collecting/shared';

const row = {
  id: 'c1',
  name: 'Delaware Quarter',
  title: null,
  year: 1999,
  mint_mark: 'P',
  grade: 'MS-63',
  face_value: 0.25,
  purchase_price: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  collection_id: 'col1',
  collections: { user_id: 'u1' },
  denomination: 'Quarter',
  notes: 'From grandpa',
  condition_notes: 'Light wear',
  historical_notes: 'The first state quarter…',
  images: ['u1/obv.jpg', 'u1/rev.jpg'],
  country: 'United States',
  category: 'circulating',
  source: 'scan',
  series_id: 'state_quarters',
  specific_coin_id: 'delaware_1999',
  specific_coin_name: 'Delaware',
};

describe('coin rows', () => {
  it('maps a row to a coin', () => {
    const coin = coinFromRow(row);
    expect(coin).toMatchObject({
      id: 'c1',
      year: 1999,
      mintMark: 'P',
      userId: 'u1',
      notes: 'From grandpa',
      conditionNotes: 'Light wear',
      category: 'circulating',
      source: 'scan',
      obverseImage: 'u1/obv.jpg',
      reverseImage: 'u1/rev.jpg',
      specificCoinId: 'delaware_1999',
    });
  });

  it('falls back to year and denomination for a missing name, and coerces unknowns to null', () => {
    const coin = coinFromRow({ ...row, name: null, category: 'nonsense', source: 'import' });
    expect(coin.name).toBe('1999 Quarter');
    expect(coin.category).toBeNull();
    expect(coin.source).toBeNull();
  });

  it('writes only the fields given, so updates never blank the rest', () => {
    expect(coinToRow({ notes: 'Edited' })).toEqual({ notes: 'Edited' });
    expect(coinToRow({ conditionNotes: 'Worn', source: 'manual', grade: '' })).toEqual({
      condition_notes: 'Worn',
      source: 'manual',
      grade: null,
    });
  });

  it('round-trips the fields a save writes', () => {
    const back = coinToRow(coinFromRow(row));
    expect(back).toMatchObject({
      name: 'Delaware Quarter',
      year: 1999,
      mint_mark: 'P',
      condition_notes: 'Light wear',
      source: 'scan',
      specific_coin_id: 'delaware_1999',
    });
  });
});

describe('signed photo URLs', () => {
  it('tells storage paths from URLs and local files', () => {
    expect(isStoragePath('u1/obv.jpg')).toBe(true);
    expect(isStoragePath('https://example.com/a.jpg')).toBe(false);
    expect(isStoragePath('file:///tmp/a.jpg')).toBe(false);
    expect(isStoragePath(null)).toBe(false);
  });

  it('signs paths in one batch, passes URLs through, and caches', async () => {
    const sign = jest.fn(async (paths: string[]) => paths.map(path => ({ path, signedUrl: `https://signed/${path}` })));
    const cache = createSignedUrlCache(sign, () => 1_000);
    const coins = [
      { obverseImage: 'u1/a.jpg', reverseImage: 'file:///local.jpg' },
      { obverseImage: 'u1/b.jpg', reverseImage: null },
    ];
    const resolved = await cache.resolve(coins);
    expect(resolved[0]).toEqual({ obverseImage: 'https://signed/u1/a.jpg', reverseImage: 'file:///local.jpg' });
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign.mock.calls[0][0]).toEqual(['u1/a.jpg', 'u1/b.jpg']);

    await cache.resolve(coins);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('shows nothing for a path that failed to sign, and re-signs a forgotten one', async () => {
    const sign = jest.fn(async () => null);
    const cache = createSignedUrlCache(sign);
    expect((await cache.resolve([{ obverseImage: 'u1/a.jpg', reverseImage: null }]))[0].obverseImage).toBeNull();

    const ok = jest.fn(async (paths: string[]) => paths.map(path => ({ path, signedUrl: 'x' })));
    const cache2 = createSignedUrlCache(ok);
    await cache2.resolve([{ obverseImage: 'u1/a.jpg', reverseImage: null }]);
    cache2.forget(['u1/a.jpg']);
    await cache2.resolve([{ obverseImage: 'u1/a.jpg', reverseImage: null }]);
    expect(ok).toHaveBeenCalledTimes(2);
  });
});

describe('story rules', () => {
  it('needs a denomination plus a year or series', () => {
    expect(hasEnoughStoryDetail({ denomination: 'Quarter', year: 1999 })).toBe(true);
    expect(hasEnoughStoryDetail({ denomination: 'Quarter', series: 'State Quarters' })).toBe(true);
    expect(hasEnoughStoryDetail({ denomination: 'Quarter', year: 0 })).toBe(false);
    expect(hasEnoughStoryDetail({ year: 1999 })).toBe(false);
  });

  it('sends every field, missing ones as null', () => {
    const body = storyRequestBody(storyInputFromCoin(coinFromRow({ ...row, designer: undefined })));
    expect(Object.keys(body)).toHaveLength(10);
    expect(body).toMatchObject({ year: 1999, denomination: 'Quarter', specificCoinName: 'Delaware', designer: null });
  });

  it('carries an error code', () => {
    expect(new StoryError('x', 'auth').code).toBe('auth');
  });
});

describe('scan rules', () => {
  it('splits the upload budget across the images', () => {
    expect(MAX_SCAN_BASE64_BYTES).toBe(350 * 1024);
    expect(perImageScanBudget(2)).toBe(Math.floor((350 * 1024) / 2));
    expect(perImageScanBudget(0)).toBe(350 * 1024);
  });

  it('tries 1024px first and gets smaller', () => {
    expect(SCAN_COMPRESSION_LADDER.map(s => s.width)).toEqual([1024, 820, 640]);
  });

  it('classifies network and sign-in failures', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('Bad input'))).toBe(false);
    expect(isAuthError(new Error('Please sign in to use coin recognition'))).toBe(true);
  });

  it('summarizes an identification, or says it is incomplete', () => {
    const r = { country: 'United States', denomination: 'Quarter', year: 1999 } as CoinRecognitionResult;
    expect(shortIdentityLine(r)).toBe('United States · Quarter · 1999');
    expect(shortIdentityLine({ country: null, denomination: null, year: null } as CoinRecognitionResult)).toBe(
      'Identification incomplete'
    );
  });

  it('keeps error types as real classes', () => {
    const e = new PipelineError('quota', 1, 'Out of scans');
    expect(e).toBeInstanceOf(Error);
    expect(e).toMatchObject({ type: 'quota', stage: 1 });
    expect(new RecognitionError('x', 'rate_limit').code).toBe('rate_limit');
  });
});
