// CSV export and import of a collection. Export writes every field a collector
// typed or a scan filled in (not photos); import reads that file back, or any
// spreadsheet whose headers can be matched, and runs each row through the same
// rules as the add-coin form. Pure, so it is tested once and works anywhere.
import type { Coin } from '../types/coin';
import { COIN_CATEGORY_LABELS, coerceCoinCategory } from '../types/coin';
import { canonicalizeMintMark, formatMintMark, MINT_MARK_UNKNOWN } from './normalize';
import {
  denominationPresetFor,
  emptyCoinForm,
  formValuesToFields,
  validateCoinForm,
  type CoinFormFields,
  type CoinFormValues,
} from './coinForm';

// ---------------------------------------------------------------- columns

/** Fields an import can fill. The first thirteen are the add-coin form's. */
export type CsvField =
  | 'name'
  | 'year'
  | 'denomination'
  | 'country'
  | 'category'
  | 'mintMark'
  | 'grade'
  | 'series'
  | 'designer'
  | 'faceValue'
  | 'purchasePrice'
  | 'purchaseDate'
  | 'notes'
  | 'conditionNotes'
  | 'composition'
  | 'historicalNotes';

export const CSV_FIELD_LABELS: Record<CsvField, string> = {
  name: 'Name',
  year: 'Year',
  denomination: 'Denomination',
  country: 'Country',
  category: 'Category',
  mintMark: 'Mint mark',
  grade: 'Grade',
  series: 'Series',
  designer: 'Designer',
  faceValue: 'Face value',
  purchasePrice: 'Purchase price',
  purchaseDate: 'Purchase date',
  notes: 'Notes',
  conditionNotes: 'Condition notes',
  composition: 'Composition',
  historicalNotes: 'About this coin',
};

export const CSV_FIELDS = Object.keys(CSV_FIELD_LABELS) as CsvField[];

/** Header spellings each field answers to, compared with letters and digits only. */
const HEADER_ALIASES: Record<CsvField, string[]> = {
  name: ['name', 'coin', 'coinname', 'title', 'item'],
  year: ['year', 'yr', 'mintyear', 'dateyear'],
  denomination: ['denomination', 'denom', 'type', 'coinvalue'],
  country: ['country', 'nation', 'issuer', 'origin'],
  category: ['category', 'kind', 'issuetype'],
  mintMark: ['mintmark', 'mint', 'mm'],
  grade: ['grade', 'condition', 'sheldon'],
  series: ['series', 'set'],
  designer: ['designer', 'artist', 'engraver'],
  faceValue: ['facevalue', 'face'],
  purchasePrice: ['purchaseprice', 'price', 'cost', 'paid', 'pricepaid'],
  purchaseDate: ['purchasedate', 'dateacquired', 'acquired', 'acquireddate', 'boughton', 'datepurchased', 'date'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks'],
  conditionNotes: ['conditionnotes'],
  composition: ['composition', 'metal', 'material'],
  historicalNotes: ['aboutthiscoin', 'about', 'story', 'history', 'historicalnotes'],
};

function headerKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Column index for each field the headers name. Each column maps once. */
export type CsvMapping = Partial<Record<CsvField, number>>;

export function guessCsvMapping(headers: string[]): CsvMapping {
  const keys = headers.map(headerKey);
  const used = new Set<number>();
  const mapping: CsvMapping = {};
  // Exact alias matches, in field order, so "Purchase date" wins over "Date".
  for (const field of CSV_FIELDS) {
    for (const alias of HEADER_ALIASES[field]) {
      const index = keys.findIndex((key, i) => key === alias && !used.has(i));
      if (index >= 0) {
        mapping[field] = index;
        used.add(index);
        break;
      }
    }
  }
  return mapping;
}

// ---------------------------------------------------------------- CSV text

/**
 * Parse CSV text into rows of cells. Handles quoted cells with commas, quotes
 * ("") and line breaks, CRLF or LF endings, a byte-order mark, and the
 * semicolon or tab delimiters some spreadsheet apps write. Blank lines go.
 */
export function parseCsv(text: string): string[][] {
  const body = text.replace(/^﻿/, '');
  const firstLine = body.slice(0, body.search(/\r?\n|$/));
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>;
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch]++;
  }
  const [best, bestCount] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  const delimiter = bestCount > 0 ? best : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && body[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/**
 * One cell for export. Quoted when it needs to be; and a leading = + - or @
 * gets an apostrophe, so a spreadsheet shows the text instead of running it
 * as a formula (CSV injection). Import strips that apostrophe again.
 */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function unguard(text: string): string {
  return /^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text;
}

// ---------------------------------------------------------------- export

/** Export headers, matched by guessCsvMapping, so an export imports cleanly. */
export const CSV_EXPORT_HEADERS = [
  'Name',
  'Year',
  'Denomination',
  'Country',
  'Category',
  'Mint mark',
  'Grade',
  'Series',
  'Designer',
  'Face value',
  'Purchase price',
  'Purchase date',
  'Notes',
  'Condition notes',
  'Composition',
  'About this coin',
  'Added',
  'Source',
];

/** The collection as CSV text, one row per coin. */
export function coinsToCsv(coins: Coin[]): string {
  const lines = [CSV_EXPORT_HEADERS.map(csvCell).join(',')];
  for (const coin of coins) {
    const category = coerceCoinCategory(coin.category);
    lines.push(
      [
        coin.name,
        coin.year || null,
        coin.denomination,
        coin.country,
        category ? COIN_CATEGORY_LABELS[category] : null,
        formatMintMark(coin.mintMark),
        coin.grade,
        coin.series,
        coin.designer,
        coin.faceValue,
        coin.purchasePrice,
        coin.purchaseDate,
        coin.notes,
        coin.conditionNotes,
        coin.composition,
        coin.historicalNotes,
        coin.createdAt ? coin.createdAt.slice(0, 10) : null,
        coin.source,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  // CRLF is what spreadsheet apps expect.
  return lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------- import

/** The number in "$1,234.50" or "45 USD"; blank when there isn't one. */
function cleanAmount(value: string): string {
  const stripped = value.replace(/[^0-9.\-]/g, '');
  return stripped && Number.isFinite(Number(stripped)) ? stripped : '';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD from "2024-03-09", "3/9/2024", or "2024/3/9"; null otherwise. */
export function normalizeCsvDate(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  let y: number, m: number, d: number;
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    // US order, which is what the app's own users write.
    [m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** What one imported row becomes. */
export type CsvCoinFields = CoinFormFields &
  Partial<Pick<Coin, 'conditionNotes' | 'composition' | 'historicalNotes'>>;

export interface CsvRowResult {
  /** The row's line in the file (the header is line 1). */
  line: number;
  /** Ready to save, or null when the row can't be imported. */
  fields: CsvCoinFields | null;
  /** Why it can't be imported. */
  errors: string[];
  /** Imported, but something was adjusted or dropped. */
  notes: string[];
}

/**
 * Turn data rows into coins with the add-coin form's rules. A missing name is
 * built from the year and denomination; a blank mint mark becomes "Not sure"
 * (blank can't be stored); a purchase date that can't be read is left out.
 */
export function csvRowsToCoins(rows: string[][], mapping: CsvMapping, firstLine = 2): CsvRowResult[] {
  return rows.map((row, i) => {
    const cell = (field: CsvField) => {
      const index = mapping[field];
      return index === undefined ? '' : unguard((row[index] ?? '').trim());
    };
    const notes: string[] = [];

    const denominationRaw = cell('denomination');
    const denomination = denominationPresetFor(denominationRaw) ?? denominationRaw;

    let mintMark = canonicalizeMintMark(cell('mintMark'));
    if (!mintMark) {
      mintMark = MINT_MARK_UNKNOWN;
      if (mapping.mintMark !== undefined) notes.push('No mint mark given; saved as "Not sure".');
    }

    const categoryRaw = cell('category');
    const category = coerceCoinCategory(categoryRaw);
    if (categoryRaw && !category) notes.push(`Category "${categoryRaw}" isn't one the app uses; left blank.`);

    const dateRaw = cell('purchaseDate');
    const purchaseDate = normalizeCsvDate(dateRaw);
    if (dateRaw && !purchaseDate) notes.push(`Purchase date "${dateRaw}" couldn't be read; left blank.`);

    const year = cell('year').replace(/\.0+$/, '');
    const name = cell('name') || [year, denomination].filter(Boolean).join(' ');

    const values: CoinFormValues = {
      ...emptyCoinForm,
      name,
      year,
      denomination,
      country: cell('country'),
      category: category ?? '',
      mintMark,
      grade: cell('grade'),
      series: cell('series'),
      designer: cell('designer'),
      faceValue: cleanAmount(cell('faceValue')),
      purchasePrice: cleanAmount(cell('purchasePrice')),
      purchaseDate: purchaseDate ?? '',
      notes: cell('notes'),
    };

    const problems = validateCoinForm(values);
    const errors: string[] = [];
    if (problems.year) errors.push(year ? `Year "${year}" isn't a number.` : 'No year.');
    if (problems.denomination) errors.push('No denomination.');
    if (problems.name) errors.push('No name, year, or denomination to name it by.');
    if (errors.length) return { line: firstLine + i, fields: null, errors, notes };

    const fields: CsvCoinFields = formValuesToFields(values, 'create');
    // Scan-written fields, carried through so an export imports back whole.
    const conditionNotes = cell('conditionNotes');
    const composition = cell('composition');
    const historicalNotes = cell('historicalNotes');
    if (conditionNotes) fields.conditionNotes = conditionNotes;
    if (composition) fields.composition = composition;
    if (historicalNotes) fields.historicalNotes = historicalNotes;
    return { line: firstLine + i, fields, errors, notes };
  });
}

/** A key for "is this coin already in the collection?" */
export function csvDuplicateKey(coin: {
  name?: string | null;
  year?: number | null;
  denomination?: string | null;
  mintMark?: string | null;
}): string {
  return [coin.name, coin.year, coin.denomination, coin.mintMark]
    .map(part => String(part ?? '').trim().toLowerCase())
    .join('|');
}
