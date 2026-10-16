// What the coin detail screen shows, shared so mobile and web list the same
// fields in the same order. Moved from mobile-app's CoinDetailScreen.
import type { Coin } from '../types/coin';
import { COIN_CATEGORY_LABELS } from '../types/coin';
import { formatMintMark, mintMarkLetter } from './normalize';

export interface CoinDetailRow {
  label: string;
  value: string | null | undefined;
}

export interface CoinDetailSection {
  title: string;
  /** Only rows with a value; a section with none is left out entirely. */
  rows: { label: string; value: string }[];
}

/** "1999 Quarter", the line under the coin's name. */
export function coinTitleLine(coin: Pick<Coin, 'year' | 'denomination'>): string {
  return `${coin.year} ${coin.denomination}`;
}

/**
 * "UNITED STATES · MS-63 · MINT D", or null. Only a real stamped letter earns
 * space here; "no mint mark" and "unknown" are spelled out in the rows.
 */
export function coinSubtitleLine(coin: Pick<Coin, 'country' | 'grade' | 'mintMark'>): string | null {
  const letter = mintMarkLetter(coin.mintMark);
  return [coin.country, coin.grade, letter && `Mint ${letter}`].filter(Boolean).join(' · ').toUpperCase() || null;
}

function formatDate(value: string | null | undefined): string | null {
  return value ? new Date(value).toLocaleDateString() : null;
}

/** Basics, details, and acquisition, each with only the rows that have a value. */
export function coinDetailSections(
  coin: Coin,
  formatMoney: (n: number) => string
): CoinDetailSection[] {
  const money = (n: number | null | undefined) => (n == null ? null : formatMoney(n));
  const sections: { title: string; rows: CoinDetailRow[] }[] = [
    {
      title: 'BASICS',
      rows: [
        { label: 'YEAR', value: coin.year ? String(coin.year) : null },
        { label: 'DENOMINATION', value: coin.denomination },
        { label: 'COUNTRY', value: coin.country },
        { label: 'MINT MARK', value: formatMintMark(coin.mintMark) },
        { label: 'CATEGORY', value: coin.category ? COIN_CATEGORY_LABELS[coin.category] : null },
      ],
    },
    {
      title: 'DETAILS',
      rows: [
        { label: 'GRADE', value: coin.grade },
        { label: 'SERIES', value: coin.series },
        { label: 'SPECIFIC COIN', value: coin.specificCoinName },
        { label: 'DESIGNER', value: coin.designer },
        { label: 'THEME', value: coin.theme },
        { label: 'HONOREE', value: coin.honoree },
        { label: 'RELEASE DATE', value: formatDate(coin.releaseDate) },
        { label: 'CERT NUMBER', value: coin.certificationNumber },
        { label: 'GRADING SERVICE', value: coin.gradingService },
      ],
    },
    {
      title: 'ACQUISITION',
      rows: [
        { label: 'FACE VALUE', value: money(coin.faceValue) },
        { label: 'PURCHASE PRICE', value: money(coin.purchasePrice) },
        { label: 'PURCHASE DATE', value: formatDate(coin.purchaseDate) },
      ],
    },
  ];
  return sections
    .map(section => ({
      title: section.title,
      rows: section.rows.filter((r): r is { label: string; value: string } => !!r.value && String(r.value).trim() !== ''),
    }))
    .filter(section => section.rows.length > 0);
}
