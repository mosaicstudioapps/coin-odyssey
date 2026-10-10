import { buildCoinName } from '../coinName';

// The bug this guards: the name was built from year + denomination alone, so a
// shelf of American Women Quarters all saved as "2022 Quarter Dollar" —
// indistinguishable on the collection screen and unsearchable by honoree.

describe('buildCoinName', () => {
  it('uses the design when the recogniser identified one', () => {
    expect(
      buildCoinName({ year: 2022, denomination: 'Quarter Dollar', design: 'Nina Otero-Warren' })
    ).toBe('2022 Nina Otero-Warren Quarter Dollar');
  });

  it('does not repeat a denomination the design already names', () => {
    expect(
      buildCoinName({ year: 1999, denomination: 'Quarter Dollar', design: 'Delaware State Quarter' })
    ).toBe('1999 Delaware State Quarter');
  });

  it('matches the denomination through its aliases, not by exact text', () => {
    // "Penny" and "Cent" are the same denomination; the design names it once.
    expect(
      buildCoinName({ year: 1943, denomination: 'Penny', design: 'Lincoln Wheat Cent' })
    ).toBe('1943 Lincoln Wheat Cent');
  });

  it('falls back to year and denomination when no design was recognised', () => {
    expect(buildCoinName({ year: 1921, denomination: 'Dollar', design: null })).toBe('1921 Dollar');
  });

  it('appends an unrecognised denomination rather than dropping it', () => {
    // "Franc" is not in the denomination vocabulary, so it cannot be shown to
    // be redundant — keep it rather than silently losing it.
    expect(
      buildCoinName({ year: 1968, denomination: 'Franc', design: 'Helvetia Standing' })
    ).toBe('1968 Helvetia Standing Franc');
  });

  it('survives a recognition with nothing usable in it', () => {
    expect(buildCoinName({ year: null, denomination: null, design: null })).toBe('Untitled coin');
  });

  it('omits a missing year instead of printing an empty gap', () => {
    expect(buildCoinName({ year: null, denomination: 'Quarter Dollar', design: 'Maya Angelou' })).toBe(
      'Maya Angelou Quarter Dollar'
    );
  });
});
