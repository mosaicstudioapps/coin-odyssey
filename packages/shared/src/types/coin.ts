/**
 * What kind of issue a coin is — orthogonal to its denomination.
 *
 * Collectors need somewhere to record this, and without a field for it they
 * put it in `denomination` instead, which is where the album matcher looks for
 * what the coin is worth. The first five values match CoinSeries.category so
 * the two vocabularies agree; `ancient` covers pieces struck before modern
 * mint practice, where "circulating" is not a useful distinction.
 */
export type CoinCategory =
  | 'circulating'
  | 'commemorative'
  | 'bullion'
  | 'proof'
  | 'special'
  | 'ancient';

export const COIN_CATEGORIES: readonly CoinCategory[] = [
  'circulating',
  'commemorative',
  'bullion',
  'proof',
  'special',
  'ancient',
];

export const COIN_CATEGORY_LABELS: Record<CoinCategory, string> = {
  circulating: 'Circulating',
  commemorative: 'Commemorative',
  bullion: 'Bullion',
  proof: 'Proof',
  special: 'Special issue',
  ancient: 'Ancient',
};

export function isCoinCategory(value: string | null | undefined): value is CoinCategory {
  return !!value && (COIN_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Fold free text into the category vocabulary, or null when it isn't one.
 * Handles the catalogue wording that ended up in `denomination` on imported
 * rows ("Regular issue" -> circulating).
 */
export function coerceCoinCategory(value: string | null | undefined): CoinCategory | null {
  if (!value) return null;
  const text = value.trim().toLowerCase();
  if (isCoinCategory(text)) return text;
  if (text === 'regular issue' || text === 'regular' || text === 'circulation') return 'circulating';
  if (text === 'commemoratives') return 'commemorative';
  if (text === 'special issue') return 'special';
  return null;
}

export interface Coin {
  id: string;
  name: string;
  title: string;
  year: number;
  mintMark: string | null;
  grade: string | null;
  faceValue: number | null;
  purchasePrice: number | null;
  currentMarketValue: number | null;
  lastValueUpdate: string | null;
  pcgsId: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  collectionId: string;
  denomination: string;
  purchaseDate: string | null;
  personalValue: number | null;
  lastAppraisalValue: number | null;
  lastAppraisalDate: string | null;
  mintage: number | null;
  rarityScale: number | null;
  historicalNotes: string | null;
  varietyNotes: string | null;
  notes: string | null;
  images: string[] | null;
  obverseImage: string | null;
  reverseImage: string | null;
  country: string | null;
  series: string | null;
  category: CoinCategory | null;
}

export interface CoinValueHistory {
  id: string;
  coinId: string;
  marketValue: number;
  valueDate: Date;
  source: string | null;
  createdAt: Date;
}

export type SearchField = 'all' | 'denomination' | 'year' | 'grade' | 'mintMark';

export type GradeFilter =
  | ''
  | 'MS-70 to MS-65'
  | 'MS-64 to MS-60'
  | 'AU-58 to AU-50'
  | 'XF-45 to XF-40'
  | 'VF-35 to VF-20'
  | 'F-15 to F-12'
  | 'VG-10 to VG-8'
  | 'G-6 to G-4'
  | 'AG-3 to PR-1';

export type ValueFilter =
  | ''
  | 'Under $10'
  | '$10 - $50'
  | '$50 - $100'
  | '$100 - $500'
  | 'Over $500';
