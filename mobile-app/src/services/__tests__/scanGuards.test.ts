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
  it('keeps marks the US actually struck', () => {
    expect(sanitizeRecognizedMintMark('D', 'United States')).toBe('D');
    expect(sanitizeRecognizedMintMark('cc', 'USA')).toBe('CC');
    expect(sanitizeRecognizedMintMark('w', 'United States of America')).toBe('W');
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
    // Germany's own mints use A, D, F, G and J; a guessed whitelist would
    // reject more real marks than invented ones.
    expect(sanitizeRecognizedMintMark('F', 'Germany')).toBe('F');
    expect(sanitizeRecognizedMintMark('F', null)).toBe('F');
    expect(sanitizeRecognizedMintMark('F', 'Freedonia')).toBe('F');
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

  it('does not count an absent year as a rejection', () => {
    const result = guardRecognizedFields({ year: null, mintMark: null, country: null });
    expect(result).toEqual({ year: null, mintMark: null, rejected: [] });
  });
});
