import { STATE_QUARTER_COINS } from '../data/stateQuarters';
import { LINCOLN_CENT_SERIES } from '../data/lincolnCents';

export interface CoinSeries {
  id: string;
  name: string;
  shortName: string;
  country: string;
  denomination: string;
  startYear: number;
  endYear: number;
  description: string;
  category: 'commemorative' | 'circulating' | 'bullion' | 'proof' | 'special';
  mintMarks: string[];
  specificCoins: SpecificCoin[];
}

export interface SpecificCoin {
  id: string;
  name: string;
  year: number;
  description?: string;
  releaseDate?: string;
  mintage?: number;
  designer?: string;
  honoree?: string; // For commemorative coins
  theme?: string;
  mintMark?: string; // For date/mint-run series (e.g. Lincoln cents); '' or absent = no mark

  rarity?: 'common' | 'uncommon' | 'scarce' | 'rare' | 'very_rare';
}

// Comprehensive series definitions
export const COIN_SERIES: CoinSeries[] = [
  {
    id: 'american_women_quarters',
    name: 'American Women Quarters',
    shortName: 'Women Quarters',
    country: 'United States',
    denomination: 'Quarter',
    startYear: 2022,
    endYear: 2025,
    description: 'Series honoring trailblazing American women and their contributions',
    category: 'commemorative',
    mintMarks: ['P', 'D', 'S'],
    specificCoins: [
      // 2022
      {
        id: 'maya_angelou_2022',
        name: 'Maya Angelou Quarter',
        year: 2022,
        honoree: 'Maya Angelou',
        description: 'Poet, memoirist, and civil rights activist',
        releaseDate: '2022-01-10',
      },
      {
        id: 'dr_sally_ride_2022',
        name: 'Dr. Sally Ride Quarter',
        year: 2022,
        honoree: 'Dr. Sally Ride',
        description: 'First American woman in space',
        releaseDate: '2022-03-07',
      },
      {
        id: 'wilma_mankiller_2022',
        name: 'Wilma Mankiller Quarter',
        year: 2022,
        honoree: 'Wilma Mankiller',
        description: 'First female principal chief of the Cherokee Nation',
        releaseDate: '2022-06-06',
      },
      {
        id: 'nina_otero_warren_2022',
        name: 'Nina Otero-Warren Quarter',
        year: 2022,
        honoree: 'Nina Otero-Warren',
        description: 'Suffragist and the first Latina to run for Congress',
        releaseDate: '2022-08-15',
      },
      {
        id: 'anna_may_wong_2022',
        name: 'Anna May Wong Quarter',
        year: 2022,
        honoree: 'Anna May Wong',
        description: 'First Chinese American film star in Hollywood',
        releaseDate: '2022-10-24',
      },
      // 2023
      {
        id: 'bessie_coleman_2023',
        name: 'Bessie Coleman Quarter',
        year: 2023,
        honoree: 'Bessie Coleman',
        description: 'First African American and Native American woman pilot',
        releaseDate: '2023-01-23',
      },
      {
        id: 'edith_kanaka_ole_2023',
        name: 'Edith Kanakaʻole Quarter',
        year: 2023,
        honoree: 'Edith Kanakaʻole',
        description: 'Hawaiian composer, chanter, and hula dancer',
        releaseDate: '2023-04-03',
      },
      {
        id: 'eleanor_roosevelt_2023',
        name: 'Eleanor Roosevelt Quarter',
        year: 2023,
        honoree: 'Eleanor Roosevelt',
        description: 'First Lady, diplomat, and human rights activist',
        releaseDate: '2023-07-10',
      },
      {
        id: 'jovita_idar_2023',
        name: 'Jovita Idár Quarter',
        year: 2023,
        honoree: 'Jovita Idár',
        description: 'Journalist, activist, and civil rights pioneer',
        releaseDate: '2023-09-11',
      },
      {
        id: 'maria_tallchief_2023',
        name: 'Maria Tallchief Quarter',
        year: 2023,
        honoree: 'Maria Tallchief',
        description: 'Prima ballerina and America\'s first major star',
        releaseDate: '2023-11-13',
      },
      // 2024
      {
        id: 'reverend_pauli_murray_2024',
        name: 'Reverend Dr. Pauli Murray Quarter',
        year: 2024,
        honoree: 'Reverend Dr. Pauli Murray',
        description: 'Priest, lawyer, and civil rights activist',
        releaseDate: '2024-01-22',
      },
      {
        id: 'patsy_takemoto_mink_2024',
        name: 'Patsy Takemoto Mink Quarter',
        year: 2024,
        honoree: 'Patsy Takemoto Mink',
        description: 'First woman of color in Congress',
        releaseDate: '2024-04-08',
      },
      {
        id: 'mary_edwards_walker_2024',
        name: 'Dr. Mary Edwards Walker Quarter',
        year: 2024,
        honoree: 'Dr. Mary Edwards Walker',
        description: 'Civil War surgeon and only woman Medal of Honor recipient',
        releaseDate: '2024-07-15',
      },
      {
        id: 'celia_cruz_2024',
        name: 'Celia Cruz Quarter',
        year: 2024,
        honoree: 'Celia Cruz',
        description: 'Queen of Salsa music',
        releaseDate: '2024-09-23',
      },
      {
        id: 'zitkala_sa_2024',
        name: 'Zitkala-Ša Quarter',
        year: 2024,
        honoree: 'Zitkala-Ša',
        description: 'Writer, educator, and political activist',
        releaseDate: '2024-11-18',
      },
      // 2025 (planned)
      {
        id: 'ida_b_wells_2025',
        name: 'Ida B. Wells-Barnett Quarter',
        year: 2025,
        honoree: 'Ida B. Wells-Barnett',
        description: 'Journalist and civil rights activist',
        releaseDate: '2025-02-03',
      },
      {
        id: 'juliette_gordon_low_2025',
        name: 'Juliette Gordon Low Quarter',
        year: 2025,
        honoree: 'Juliette Gordon Low',
        description: 'Founder of Girl Scouts of the USA',
        releaseDate: '2025-05-12',
      },
      {
        id: 'althea_gibson_2025',
        name: 'Althea Gibson Quarter',
        year: 2025,
        honoree: 'Althea Gibson',
        description: 'Tennis champion and golf pioneer',
        releaseDate: '2025-08-04',
      },
      {
        id: 'kalpana_chawla_2025',
        name: 'Kalpana Chawla Quarter',
        year: 2025,
        honoree: 'Kalpana Chawla',
        description: 'NASA astronaut and aerospace engineer',
        releaseDate: '2025-10-27',
      },
      {
        id: 'fannie_lou_hamer_2025',
        name: 'Fannie Lou Hamer Quarter',
        year: 2025,
        honoree: 'Fannie Lou Hamer',
        description: 'Civil rights activist and voting rights advocate',
        releaseDate: '2025-12-09',
      },
    ],
  },
  {
    id: 'state_quarters',
    name: '50 State Quarters Program',
    shortName: 'State Quarters',
    country: 'United States',
    denomination: 'Quarter',
    startYear: 1999,
    endYear: 2008,
    description: 'Celebrating each of the 50 states with unique reverse designs',
    category: 'commemorative',
    mintMarks: ['P', 'D', 'S'],
    specificCoins: STATE_QUARTER_COINS,
  },
  ...LINCOLN_CENT_SERIES,
  {
    id: 'america_beautiful_quarters',
    name: 'America the Beautiful Quarters',
    shortName: 'ATB Quarters',
    country: 'United States',
    denomination: 'Quarter',
    startYear: 2010,
    endYear: 2021,
    description: 'Honoring national parks and other national sites',
    category: 'commemorative',
    mintMarks: ['P', 'D', 'S'],
    specificCoins: [
      { id: 'hot_springs_2010', name: 'Hot Springs National Park Quarter', year: 2010, description: 'Arkansas' },
      { id: 'yellowstone_2010', name: 'Yellowstone National Park Quarter', year: 2010, description: 'Wyoming' },
      { id: 'yosemite_2010', name: 'Yosemite National Park Quarter', year: 2010, description: 'California' },
      { id: 'grand_canyon_2010', name: 'Grand Canyon National Park Quarter', year: 2010, description: 'Arizona' },
      { id: 'mount_hood_2010', name: 'Mount Hood National Forest Quarter', year: 2010, description: 'Oregon' },
    ],
  },
  {
    id: 'morgan_dollars',
    name: 'Morgan Silver Dollars',
    shortName: 'Morgan Dollars',
    country: 'United States',
    denomination: 'Dollar',
    startYear: 1878,
    endYear: 1921,
    description: 'Classic American silver dollars designed by George T. Morgan',
    category: 'circulating',
    mintMarks: ['', 'CC', 'D', 'O', 'S'],
    specificCoins: [
      { id: 'morgan_1878_8tf', name: '1878 8 Tail Feathers', year: 1878, description: 'First year, 8 tail feathers', rarity: 'common' },
      { id: 'morgan_1878_7tf', name: '1878 7 Tail Feathers', year: 1878, description: 'Revised design, 7 tail feathers', rarity: 'common' },
      { id: 'morgan_1893s', name: '1893-S Morgan Dollar', year: 1893, description: 'Key date San Francisco', rarity: 'very_rare' },
      { id: 'morgan_1921', name: '1921 Morgan Dollar', year: 1921, description: 'Final year of original series', rarity: 'common' },
    ],
  },
  {
    id: 'peace_dollars',
    name: 'Peace Silver Dollars',
    shortName: 'Peace Dollars',
    country: 'United States',
    denomination: 'Dollar',
    startYear: 1921,
    endYear: 1935,
    description: 'Commemorating peace after World War I',
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: [
      { id: 'peace_1921', name: '1921 Peace Dollar', year: 1921, description: 'First year, high relief', rarity: 'uncommon' },
      { id: 'peace_1928', name: '1928 Peace Dollar', year: 1928, description: 'Key date', rarity: 'scarce' },
      { id: 'peace_1934s', name: '1934-S Peace Dollar', year: 1934, description: 'Semi-key date', rarity: 'uncommon' },
    ],
  },
  {
    id: 'walking_liberty_halves',
    name: 'Walking Liberty Half Dollars',
    shortName: 'Walking Liberty',
    country: 'United States',
    denomination: 'Half Dollar',
    startYear: 1916,
    endYear: 1947,
    description: 'Classic design by Adolph A. Weinman',
    category: 'circulating',
    mintMarks: ['', 'D', 'S'],
    specificCoins: [
      { id: 'walking_1916', name: '1916 Walking Liberty Half', year: 1916, description: 'First year', rarity: 'uncommon' },
      { id: 'walking_1916d', name: '1916-D Walking Liberty Half', year: 1916, description: 'Key date Denver mint', rarity: 'rare' },
      { id: 'walking_1921', name: '1921 Walking Liberty Half', year: 1921, description: 'Key date', rarity: 'rare' },
    ],
  },
];

// Helper functions
export function getSeriesByCountryAndDenomination(country: string, denomination: string): CoinSeries[] {
  const normalizedCountry = country.toLowerCase().trim();
  const normalizedDenomination = denomination.toLowerCase().trim();

  return COIN_SERIES.filter(series => {
    const seriesCountry = series.country.toLowerCase();
    const seriesDenomination = series.denomination.toLowerCase();

    // Handle country variations
    const countryMatches = (
      seriesCountry === normalizedCountry ||
      areCountryVariations(seriesCountry, normalizedCountry)
    );

    // Handle denomination variations
    const denominationMatches = (
      seriesDenomination === normalizedDenomination ||
      areDenominationVariations(seriesDenomination, normalizedDenomination)
    );

    return countryMatches && denominationMatches;
  });
}

// Helper functions for variations
function areCountryVariations(country1: string, country2: string): boolean {
  const usVariations = ['united states', 'usa', 'us', 'america', 'united states of america'];

  if (usVariations.includes(country1) && usVariations.includes(country2)) {
    return true;
  }

  return false;
}

function areDenominationVariations(denom1: string, denom2: string): boolean {
  const denominationMap: { [key: string]: string[] } = {
    'quarter': ['quarter', '25 cents', '0.25', 'quarters'],
    'dollar': ['dollar', '$1', '1 dollar', 'dollars'],
    'half dollar': ['half dollar', '50 cents', '0.50', 'half dollars'],
    'dime': ['dime', '10 cents', '0.10', 'dimes'],
    'nickel': ['nickel', '5 cents', '0.05', 'nickels'],
    'penny': ['penny', 'cent', '1 cent', '0.01', 'pennies', 'cents'],
  };

  for (const [standard, variations] of Object.entries(denominationMap)) {
    if (variations.includes(denom1) && variations.includes(denom2)) {
      return true;
    }
  }

  return false;
}

export function getSeriesById(id: string): CoinSeries | undefined {
  return COIN_SERIES.find(series => series.id === id);
}

export function getSpecificCoinById(seriesId: string, coinId: string): SpecificCoin | undefined {
  const series = getSeriesById(seriesId);
  return series?.specificCoins.find(coin => coin.id === coinId);
}

export function getSeriesByYear(year: number): CoinSeries[] {
  return COIN_SERIES.filter(series =>
    year >= series.startYear && year <= series.endYear
  );
}

// Common series groupings for quick access
export const US_QUARTER_SERIES = COIN_SERIES.filter(series =>
  series.country === 'United States' && series.denomination === 'Quarter'
);

export const US_DOLLAR_SERIES = COIN_SERIES.filter(series =>
  series.country === 'United States' && series.denomination === 'Dollar'
);

export const COMMEMORATIVE_SERIES = COIN_SERIES.filter(series =>
  series.category === 'commemorative'
);
