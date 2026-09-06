import {
  EARLIEST_PLAUSIBLE_COIN_YEAR,
  MINT_MARK_NONE,
  MINT_MARK_UNKNOWN,
  guardRecognizedFields,
  sanitizeMintYear,
  sanitizeRecognizedMintMark,
} from '@coin-collecting/shared';

describe('sanitizeMintYear', () => {
  it('accepts real dates, including next year', () => {
    expect(sanitizeMintYear(1883, 2026)).toBe(1883);
    expect(sanitizeMintYear(2026, 2026)).toBe(2026);
    // Mints strike the coming year's coinage in the closing months of this one.
    expect(sanitizeMintYear(2027, 2026)).toBe(2027);
  });

  it('rejects the future', () => {
    // The scan that produced this stretched the dashboard's "years of history"
    // hero stat from 144 to 152.
    expect(sanitizeMintYear(2034, 2026)).toBeNull();
    expect(sanitizeMintYear(2028, 2026)).toBeNull();
  });

  it('rejects values that are not a year at all', () => {
    expect(sanitizeMintYear(null)).toBeNull();
    expect(sanitizeMintYear(undefined)).toBeNull();
    expect(sanitizeMintYear('1955')).toBeNull();
    expect(sanitizeMintYear(1955.5)).toBeNull();
    expect(sanitizeMintYear(NaN)).toBeNull();
    // 0 is the app's own "unanswered" sentinel, and there is no year zero.
    expect(sanitizeMintYear(0, 2026)).toBeNull();
    expect(sanitizeMintYear(EARLIEST_PLAUSIBLE_COIN_YEAR - 1, 2026)).toBeNull();
  });

  it('keeps ancient dates inside the floor', () => {
    expect(sanitizeMintYear(-500, 2026)).toBe(-500);
  });
});

describe('sanitizeRecognizedMintMark', () => {
  it('keeps every mark the US has ever struck', () => {
    for (const mark of ['P', 'D', 'S', 'W', 'CC', 'O', 'C', 'M']) {
      expect(sanitizeRecognizedMintMark(mark, 'United States')).toBe(mark);
    }
    expect(sanitizeRecognizedMintMark('cc', 'USA')).toBe('CC');
    // Manila struck US coinage 1920-1941 and is the one people leave out.
    expect(sanitizeRecognizedMintMark('m', 'United States of America')).toBe('M');
  });

  it('recovers a named US mint instead of discarding it', () => {
    expect(sanitizeRecognizedMintMark('Philadelphia', 'United States')).toBe('P');
    expect(sanitizeRecognizedMintMark('San Francisco', 'USA')).toBe('S');
    expect(sanitizeRecognizedMintMark('carson city', 'United States')).toBe('CC');
    // Only against a roster — a mint name on a coin from elsewhere is not
    // quietly converted into a US mark.
    expect(sanitizeRecognizedMintMark('Denver', 'Germany')).toBe(MINT_MARK_UNKNOWN);
  });

  it('folds a mark no US mint ever used', () => {
    // The recogniser invented "F" on a Mary Edwards Walker quarter rather than
    // reporting the mark as illegible, and still scored the scan HIGH.
    expect(sanitizeRecognizedMintMark('F', 'United States')).toBe(MINT_MARK_UNKNOWN);
    expect(sanitizeRecognizedMintMark('X', 'United States')).toBe(MINT_MARK_UNKNOWN);
  });

  it('passes the sentinels through — neither is a letter to check', () => {
    // NONE is a real observation on any US coin struck before 1979.
    expect(sanitizeRecognizedMintMark('no mint mark', 'United States')).toBe(MINT_MARK_NONE);
    expect(sanitizeRecognizedMintMark('illegible', 'United States')).toBe(MINT_MARK_UNKNOWN);
    expect(sanitizeRecognizedMintMark(null, 'United States')).toBeNull();
  });

  it('leaves unresearched countries alone', () => {
    // The whole point: a US roster must not reach German coins. Germany's own
    // mints use A, B, C, D, E, F, G, H, J and T.
    for (const mark of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'T']) {
      expect(sanitizeRecognizedMintMark(mark, 'Germany')).toBe(mark);
    }
    // Mexico's marks are two letters throughout; France ran mints on most of
    // the alphabet. Both pass through untouched.
    expect(sanitizeRecognizedMintMark('Mo', 'Mexico')).toBe('MO');
    expect(sanitizeRecognizedMintMark('Zs', 'Mexico')).toBe('ZS');
    expect(sanitizeRecognizedMintMark('BB', 'France')).toBe('BB');
    expect(sanitizeRecognizedMintMark('KN', 'United Kingdom')).toBe('KN');
    // Unresolvable country is treated as unresearched, not as suspicious.
    expect(sanitizeRecognizedMintMark('F', null)).toBe('F');
    expect(sanitizeRecognizedMintMark('F', 'Freedonia')).toBe('F');
  });

  it('rejects prose everywhere, not just where we have a roster', () => {
    // Each of these was previously truncated to a plausible-looking mark and
    // stored as if the letters had been read off the coin.
    expect(sanitizeRecognizedMintMark('probably Denver', 'Germany')).toBe(MINT_MARK_UNKNOWN);
    expect(sanitizeRecognizedMintMark('mint mark obscured', 'Japan')).toBe(MINT_MARK_UNKNOWN);
    expect(sanitizeRecognizedMintMark('worn, maybe D', 'Brazil')).toBe(MINT_MARK_UNKNOWN);
    // A bare three-letter token from an unresearched country is far likelier
    // to be a truncated word than a mark.
    expect(sanitizeRecognizedMintMark('PHI', 'Japan')).toBe(MINT_MARK_UNKNOWN);
    // Except the ones that are real. Potosí is the standard example.
    expect(sanitizeRecognizedMintMark('PTS', 'Bolivia')).toBe('PTS');
  });
});

describe('guardRecognizedFields', () => {
  it('reports nothing when the recogniser was plausible', () => {
    expect(
      guardRecognizedFields({ year: 2024, mintMark: 'D', country: 'United States' })
    ).toEqual({ year: 2024, mintMark: 'D', rejected: [] });
  });

  it('reports both fields of the Walker scan', () => {
    expect(
      guardRecognizedFields({ year: 2034, mintMark: 'F', country: 'United States' })
    ).toEqual({ year: null, mintMark: MINT_MARK_UNKNOWN, rejected: ['year', 'mintMark'] });
  });

  it('does not count an honestly illegible mark as a rejection', () => {
    expect(
      guardRecognizedFields({ year: 2024, mintMark: 'not visible', country: 'United States' })
    ).toEqual({ year: 2024, mintMark: MINT_MARK_UNKNOWN, rejected: [] });
  });

  it('counts prose as a rejection — it is the error worth measuring', () => {
    // Not US-specific: the recogniser asserting something unreadable is a
    // failure wherever the coin is from.
    expect(
      guardRecognizedFields({ year: 1975, mintMark: 'probably Denver', country: 'Germany' })
    ).toEqual({ year: 1975, mintMark: MINT_MARK_UNKNOWN, rejected: ['mintMark'] });
  });

  it('does not count a recovered mint name as a rejection', () => {
    expect(
      guardRecognizedFields({ year: 1955, mintMark: 'Philadelphia', country: 'United States' })
    ).toEqual({ year: 1955, mintMark: 'P', rejected: [] });
  });

  it('does not count an absent year as a rejection', () => {
    const result = guardRecognizedFields({ year: null, mintMark: null, country: null });
    expect(result).toEqual({ year: null, mintMark: null, rejected: [] });
  });
});
