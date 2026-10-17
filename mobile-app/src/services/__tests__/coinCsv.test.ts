// src/services/__tests__/coinCsv.test.ts
//
// CSV export and import (packages/shared/src/utils/coinCsv.ts), used by the
// web app's Import and export page.
import {
  MINT_MARK_NONE,
  MINT_MARK_UNKNOWN,
  coinsToCsv,
  csvDuplicateKey,
  csvRowsToCoins,
  guessCsvMapping,
  normalizeCsvDate,
  parseCsv,
  type Coin,
} from '@coin-collecting/shared';

describe('parseCsv', () => {
  it('reads quotes, embedded commas and line breaks, CRLF, and a BOM', () => {
    const text = '﻿Name,Notes\r\n"Kennedy, Half","Line one\nline ""two"""\r\nPlain,\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ['Name', 'Notes'],
      ['Kennedy, Half', 'Line one\nline "two"'],
      ['Plain', ''],
    ]);
  });

  it('detects semicolon and tab delimiters', () => {
    expect(parseCsv('Name;Year\nA;1964')).toEqual([['Name', 'Year'], ['A', '1964']]);
    expect(parseCsv('Name\tYear\nA\t1964')).toEqual([['Name', 'Year'], ['A', '1964']]);
  });
});

describe('guessCsvMapping', () => {
  it('matches common headers, preferring the specific date column', () => {
    const mapping = guessCsvMapping(['Coin Name', 'Year', 'Denom', 'Mint', 'Date', 'Purchase Date', 'Price Paid']);
    expect(mapping).toEqual({ name: 0, year: 1, denomination: 2, mintMark: 3, purchaseDate: 5, purchasePrice: 6 });
  });

  it('maps its own export headers back', () => {
    const headers = parseCsv(coinsToCsv([]))[0];
    const mapping = guessCsvMapping(headers);
    expect(Object.keys(mapping)).toHaveLength(16);
  });
});

describe('csvRowsToCoins', () => {
  const mapping = guessCsvMapping(['Name', 'Year', 'Denomination', 'Mint mark', 'Category', 'Purchase price', 'Purchase date']);

  it('runs rows through the form rules and saves them as typed in', () => {
    const [row] = csvRowsToCoins([['', '1964', 'penny', 'none', 'Regular issue', '$1,250.50', '3/9/2024']], mapping);
    expect(row.errors).toEqual([]);
    expect(row.fields).toMatchObject({
      name: '1964 Cent',
      year: 1964,
      denomination: 'Cent',
      mintMark: MINT_MARK_NONE,
      category: 'circulating',
      purchasePrice: 1250.5,
      purchaseDate: '2024-03-09',
      source: 'manual',
    });
  });

  it('saves a blank mint mark as "Not sure", and notes what it changed', () => {
    const [row] = csvRowsToCoins([['Dime', '1950', 'Dime', '', 'Odd', '', '31/31/2020']], mapping);
    expect(row.fields?.mintMark).toBe(MINT_MARK_UNKNOWN);
    expect(row.fields?.category).toBeUndefined();
    expect(row.fields?.purchaseDate).toBeUndefined();
    expect(row.notes).toHaveLength(3);
  });

  it('rejects rows without a usable year or denomination, with the file line', () => {
    const rows = csvRowsToCoins([['A', 'old', 'Cent'], ['B', '1999', '']], mapping);
    expect(rows.map(r => [r.line, r.fields, r.errors])).toEqual([
      [2, null, ['Year "old" isn\'t a number.']],
      [3, null, ['No denomination.']],
    ]);
  });
});

describe('export', () => {
  const coin = {
    id: 'c1',
    name: '=HYPERLINK("x")',
    year: -300,
    denomination: 'Drachm',
    country: 'Greece',
    mintMark: MINT_MARK_NONE,
    category: 'ancient',
    notes: 'Says "hello", twice',
    composition: 'Silver',
    createdAt: '2026-10-01T12:00:00Z',
    source: 'manual',
  } as unknown as Coin;

  it('defuses formulas, and round-trips through import', () => {
    const csv = coinsToCsv([coin]);
    expect(csv).toContain(`'=HYPERLINK`);
    const [headers, ...rows] = parseCsv(csv);
    const [row] = csvRowsToCoins(rows, guessCsvMapping(headers));
    expect(row.fields).toMatchObject({
      name: '=HYPERLINK("x")',
      year: -300,
      denomination: 'Drachm',
      mintMark: MINT_MARK_NONE,
      category: 'ancient',
      notes: 'Says "hello", twice',
      composition: 'Silver',
    });
  });

  it('keys duplicates on name, year, denomination, and mint mark', () => {
    expect(csvDuplicateKey(coin)).toBe(csvDuplicateKey({ ...coin, name: ' =hyperlink("x") ' }));
  });

  it('reads only real dates', () => {
    expect(normalizeCsvDate('2024-02-30')).toBeNull();
    expect(normalizeCsvDate('2024/2/3')).toBe('2024-02-03');
  });
});
