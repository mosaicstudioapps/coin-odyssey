// src/services/__tests__/coinForm.test.ts
import {
  MINT_MARK_NONE,
  coinFromRow,
  coinToFormValues,
  denominationPresetFor,
  emptyCoinForm,
  formValuesToFields,
  isCustomMintMark,
  validateCoinForm,
  type CoinFormValues,
} from '@coin-collecting/shared';

const filled = (overrides: Partial<CoinFormValues> = {}): CoinFormValues => ({
  ...emptyCoinForm,
  name: '1999 Delaware Quarter',
  year: '1999',
  denomination: 'Quarter',
  mintMark: 'P',
  ...overrides,
});

describe('validation', () => {
  it('needs a name, a year, a denomination, and a mint mark answer', () => {
    expect(validateCoinForm(emptyCoinForm)).toEqual({
      name: 'Required',
      year: 'Enter a year',
      denomination: 'Required',
      mintMark: 'Pick one — "Not sure" is fine',
    });
    expect(validateCoinForm(filled())).toEqual({});
  });

  it('rejects a year that is not a number', () => {
    expect(validateCoinForm(filled({ year: 'about 1900' })).year).toBe('Enter a year');
  });
});

describe('saving a new coin', () => {
  it('leaves empty fields out and marks the coin as added by hand', () => {
    expect(formValuesToFields(filled({ notes: '  ', faceValue: '' }), 'create')).toEqual({
      name: '1999 Delaware Quarter',
      year: 1999,
      denomination: 'Quarter',
      mintMark: 'P',
      source: 'manual',
    });
  });

  it('parses amounts and keeps a known category', () => {
    const fields = formValuesToFields(filled({ faceValue: '0.25', purchasePrice: '3.5', category: 'commemorative' }), 'create');
    expect(fields).toMatchObject({ faceValue: 0.25, purchasePrice: 3.5, category: 'commemorative' });
  });
});

describe('saving an edit', () => {
  it('sends cleared fields as null so they actually clear', () => {
    const fields = formValuesToFields(filled({ notes: '', grade: '', purchasePrice: '', category: '' }), 'update');
    expect(fields).toMatchObject({ notes: null, grade: null, purchasePrice: null, category: null });
    expect(fields.source).toBeUndefined();
  });

  it('round-trips a saved coin through the form unchanged', () => {
    const coin = coinFromRow({
      id: 'c1', name: 'Kennedy Half', year: 1964, denomination: 'Half Dollar', mint_mark: 'D',
      grade: 'MS-63', notes: 'From grandpa', face_value: 0.5, category: 'circulating', images: ['u/a.jpg'],
    });
    const values = coinToFormValues(coin);
    expect(values).toMatchObject({ name: 'Kennedy Half', year: '1964', mintMark: 'D', faceValue: '0.5', obverseUri: 'u/a.jpg' });
    expect(formValuesToFields(values, 'update')).toMatchObject({
      name: 'Kennedy Half', year: 1964, denomination: 'Half Dollar', mintMark: 'D', grade: 'MS-63',
      notes: 'From grandpa', faceValue: 0.5, category: 'circulating',
    });
  });
});

describe('pickers', () => {
  it('puts alternate denomination names on the right chip', () => {
    expect(denominationPresetFor('Penny')).toBe('Cent');
    expect(denominationPresetFor('25 cents')).toBe('Quarter');
    expect(denominationPresetFor('Drachma')).toBeNull();
    expect(denominationPresetFor('')).toBeNull();
  });

  it('tells chip mint marks from typed-in ones', () => {
    expect(isCustomMintMark('D')).toBe(false);
    expect(isCustomMintMark(MINT_MARK_NONE)).toBe(false);
    expect(isCustomMintMark('cc')).toBe(true);
    expect(isCustomMintMark('')).toBe(false);
  });
});

describe('coin detail sections', () => {
  const { coinDetailSections, coinSubtitleLine, coinTitleLine } = require('@coin-collecting/shared');
  const coin = coinFromRow({
    id: 'c1', name: 'Kennedy Half', year: 1964, denomination: 'Half Dollar', country: 'United States',
    mint_mark: 'D', grade: 'MS-63', face_value: 0.5, category: 'circulating',
  });

  it('lists only rows with values, and drops empty sections', () => {
    const sections = coinDetailSections(coin, (n: number) => `$${n.toFixed(2)}`);
    expect(sections.map((s: { title: string }) => s.title)).toEqual(['BASICS', 'DETAILS', 'ACQUISITION']);
    expect(sections[1].rows).toEqual([{ label: 'GRADE', value: 'MS-63' }]);
    expect(sections[2].rows).toEqual([{ label: 'FACE VALUE', value: '$0.50' }]);
  });

  it('builds the title and subtitle lines', () => {
    expect(coinTitleLine(coin)).toBe('1964 Half Dollar');
    expect(coinSubtitleLine(coin)).toBe('UNITED STATES · MS-63 · MINT D');
    expect(coinSubtitleLine({ country: null, grade: null, mintMark: 'NONE' })).toBeNull();
  });
});
