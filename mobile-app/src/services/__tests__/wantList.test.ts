// src/services/__tests__/wantList.test.ts
//
// The want list (packages/shared/src/utils/wantList.ts).
import { buildAlbums, resolveWantList, wantCount, wantListText, type Coin } from '@coin-collecting/shared';

const albums = buildAlbums(2026);
const coin = (over: Partial<Coin>) =>
  ({ id: Math.random().toString(36), name: '', year: 1999, denomination: 'Quarter', country: 'United States', mintMark: null, ...over }) as Coin;

describe('want list', () => {
  const entries = [
    { albumId: 'state_quarters', slotId: 'delaware_1999__D' },
    { albumId: 'state_quarters', slotId: 'pennsylvania_1999' },
    { albumId: 'morgan_dollars', slotId: 'morgan_1893_s' },
    { albumId: 'morgan_dollars', slotId: 'no_such_slot' },
  ];

  it('groups wants by album in album order, with readable titles', () => {
    const groups = resolveWantList(entries, [], albums);
    expect(groups.map(g => g.album.id)).toEqual(['state_quarters', 'morgan_dollars']);
    expect(groups[0].items.map(i => i.title)).toEqual(['1999 Pennsylvania', '1999 Delaware · D']);
    expect(groups[1].items.map(i => i.title)).toEqual(['1893-S']);
    expect(wantCount(groups)).toBe(3);
  });

  it('drops a want once its slot is filled', () => {
    const den = coin({ name: 'Delaware Quarter', mintMark: 'D' });
    const groups = resolveWantList(entries, [den], albums);
    expect(groups[0].items.map(i => i.title)).toEqual(['1999 Pennsylvania']);
  });

  it('writes a plain-text list to share', () => {
    const text = wantListText(resolveWantList(entries, [], albums));
    expect(text).toContain('50 State Quarters\n  • 1999 Pennsylvania\n  • 1999 Delaware · D');
    expect(text).toContain('Morgan Dollars\n  • 1893-S');
  });
});
