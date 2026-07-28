import { normalizeCountry } from '../utils/normalize';

// World album: one slot per coin-issuing country — UN members that issue
// coinage plus notable non-UN issuers (Vatican City, Taiwan, Kosovo).
// Aliases cover short forms, long official forms, and historical names that
// show up on real coins ("USSR", "West Germany", "Ceylon", "HELVETIA").
// Matching is by exact normalized lookup (normalizeCountry), never substring.

export type WorldRegion =
  | 'North America'
  | 'Central America & Caribbean'
  | 'South America'
  | 'Europe'
  | 'Middle East'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

/** Display order for the World album's sections. */
export const WORLD_REGIONS: WorldRegion[] = [
  'North America',
  'Central America & Caribbean',
  'South America',
  'Europe',
  'Middle East',
  'Africa',
  'Asia',
  'Oceania',
];

export interface WorldCountry {
  code: string;
  name: string;
  region: WorldRegion;
  aliases?: string[];
}

function region(r: WorldRegion) {
  return (code: string, name: string, aliases?: string[]): WorldCountry =>
    aliases ? { code, name, region: r, aliases } : { code, name, region: r };
}

const na = region('North America');
const ca = region('Central America & Caribbean');
const sa = region('South America');
const eu = region('Europe');
const me = region('Middle East');
const af = region('Africa');
const as = region('Asia');
const oc = region('Oceania');

export const WORLD_COUNTRIES: WorldCountry[] = [
  // North America
  na('US', 'United States', ['usa', 'us', 'united states of america', 'america']),
  na('CA', 'Canada'),
  na('MX', 'Mexico', ['estados unidos mexicanos', 'mexican states']),

  // Central America & Caribbean
  ca('AG', 'Antigua and Barbuda', ['antigua']),
  ca('BS', 'Bahamas'),
  ca('BB', 'Barbados'),
  ca('BZ', 'Belize', ['british honduras']),
  ca('CR', 'Costa Rica'),
  ca('CU', 'Cuba'),
  ca('DM', 'Dominica'),
  ca('DO', 'Dominican Republic'),
  ca('SV', 'El Salvador'),
  ca('GD', 'Grenada'),
  ca('GT', 'Guatemala'),
  ca('HT', 'Haiti'),
  ca('HN', 'Honduras'),
  ca('JM', 'Jamaica'),
  ca('NI', 'Nicaragua'),
  ca('PA', 'Panama'),
  ca('KN', 'Saint Kitts and Nevis', ['st kitts and nevis', 'saint kitts', 'st kitts']),
  ca('LC', 'Saint Lucia', ['st lucia']),
  ca('VC', 'Saint Vincent and the Grenadines', ['st vincent and the grenadines', 'saint vincent', 'st vincent']),
  ca('TT', 'Trinidad and Tobago', ['trinidad']),

  // South America
  sa('AR', 'Argentina'),
  sa('BO', 'Bolivia'),
  sa('BR', 'Brazil', ['brasil']),
  sa('CL', 'Chile'),
  sa('CO', 'Colombia'),
  sa('EC', 'Ecuador'),
  sa('GY', 'Guyana', ['british guiana']),
  sa('PY', 'Paraguay'),
  sa('PE', 'Peru'),
  sa('SR', 'Suriname', ['surinam', 'dutch guiana']),
  sa('UY', 'Uruguay'),
  sa('VE', 'Venezuela'),

  // Europe
  eu('AL', 'Albania'),
  eu('AD', 'Andorra'),
  eu('AT', 'Austria', ['osterreich']),
  eu('BY', 'Belarus', ['byelorussia']),
  eu('BE', 'Belgium', ['belgique', 'belgie']),
  eu('BA', 'Bosnia and Herzegovina', ['bosnia']),
  eu('BG', 'Bulgaria'),
  eu('HR', 'Croatia', ['hrvatska']),
  eu('CZ', 'Czech Republic', ['czechia', 'czechoslovakia', 'ceska republika']),
  eu('DK', 'Denmark', ['danmark']),
  eu('EE', 'Estonia', ['eesti']),
  eu('FI', 'Finland', ['suomi']),
  eu('FR', 'France', ['republique francaise', 'french republic']),
  eu('DE', 'Germany', [
    'deutschland',
    'west germany',
    'east germany',
    'german democratic republic',
    'federal republic of germany',
    'bundesrepublik deutschland',
  ]),
  eu('GR', 'Greece', ['hellas', 'hellenic republic']),
  eu('HU', 'Hungary', ['magyarorszag']),
  eu('IS', 'Iceland', ['island']),
  eu('IE', 'Ireland', ['eire', 'republic of ireland']),
  eu('IT', 'Italy', ['italia', 'italian republic']),
  eu('XK', 'Kosovo'),
  eu('LV', 'Latvia', ['latvija']),
  eu('LI', 'Liechtenstein'),
  eu('LT', 'Lithuania', ['lietuva']),
  eu('LU', 'Luxembourg'),
  eu('MT', 'Malta'),
  eu('MD', 'Moldova'),
  eu('MC', 'Monaco'),
  eu('ME', 'Montenegro'),
  eu('NL', 'Netherlands', ['holland', 'nederland']),
  eu('MK', 'North Macedonia', ['macedonia']),
  eu('NO', 'Norway', ['norge']),
  eu('PL', 'Poland', ['polska']),
  eu('PT', 'Portugal'),
  eu('RO', 'Romania'),
  eu('RU', 'Russia', ['russian federation', 'ussr', 'soviet union', 'cccp']),
  eu('SM', 'San Marino'),
  eu('RS', 'Serbia', ['yugoslavia']),
  eu('SK', 'Slovakia', ['slovensko']),
  eu('SI', 'Slovenia', ['slovenija']),
  eu('ES', 'Spain', ['espana']),
  eu('SE', 'Sweden', ['sverige']),
  eu('CH', 'Switzerland', ['helvetia', 'swiss confederation', 'confoederatio helvetica']),
  eu('UA', 'Ukraine'),
  eu('GB', 'United Kingdom', [
    'uk',
    'great britain',
    'britain',
    'england',
    'scotland',
    'wales',
    'northern ireland',
  ]),
  eu('VA', 'Vatican City', ['vatican', 'holy see', 'citta del vaticano']),

  // Middle East
  me('BH', 'Bahrain'),
  me('IR', 'Iran', ['persia']),
  me('IQ', 'Iraq'),
  me('IL', 'Israel'),
  me('JO', 'Jordan'),
  me('KW', 'Kuwait'),
  me('LB', 'Lebanon'),
  me('OM', 'Oman', ['muscat and oman']),
  me('QA', 'Qatar'),
  me('SA', 'Saudi Arabia'),
  me('SY', 'Syria', ['syrian arab republic']),
  me('TR', 'Turkey', ['turkiye']),
  me('AE', 'United Arab Emirates', ['uae', 'emirates']),
  me('YE', 'Yemen'),

  // Africa
  af('DZ', 'Algeria'),
  af('AO', 'Angola'),
  af('BJ', 'Benin', ['dahomey']),
  af('BW', 'Botswana'),
  af('BF', 'Burkina Faso', ['upper volta']),
  af('BI', 'Burundi'),
  af('CV', 'Cabo Verde', ['cape verde']),
  af('CM', 'Cameroon'),
  af('CF', 'Central African Republic'),
  af('TD', 'Chad', ['tchad']),
  af('KM', 'Comoros'),
  af('CG', 'Republic of the Congo', ['congo', 'congo brazzaville']),
  af('CD', 'Democratic Republic of the Congo', ['dr congo', 'drc', 'congo kinshasa', 'zaire']),
  af('CI', "Côte d'Ivoire", ['ivory coast']),
  af('DJ', 'Djibouti'),
  af('EG', 'Egypt'),
  af('GQ', 'Equatorial Guinea'),
  af('ER', 'Eritrea'),
  af('SZ', 'Eswatini', ['swaziland']),
  af('ET', 'Ethiopia', ['abyssinia']),
  af('GA', 'Gabon'),
  af('GM', 'Gambia'),
  af('GH', 'Ghana', ['gold coast']),
  af('GN', 'Guinea'),
  af('GW', 'Guinea-Bissau'),
  af('KE', 'Kenya'),
  af('LS', 'Lesotho'),
  af('LR', 'Liberia'),
  af('LY', 'Libya'),
  af('MG', 'Madagascar'),
  af('MW', 'Malawi', ['nyasaland']),
  af('ML', 'Mali'),
  af('MR', 'Mauritania'),
  af('MU', 'Mauritius'),
  af('MA', 'Morocco', ['maroc']),
  af('MZ', 'Mozambique'),
  af('NA', 'Namibia'),
  af('NE', 'Niger'),
  af('NG', 'Nigeria'),
  af('RW', 'Rwanda'),
  af('ST', 'São Tomé and Príncipe', ['sao tome']),
  af('SN', 'Senegal'),
  af('SC', 'Seychelles'),
  af('SL', 'Sierra Leone'),
  af('SO', 'Somalia'),
  af('ZA', 'South Africa', ['suid afrika']),
  af('SS', 'South Sudan'),
  af('SD', 'Sudan'),
  af('TZ', 'Tanzania', ['tanganyika']),
  af('TG', 'Togo'),
  af('TN', 'Tunisia'),
  af('UG', 'Uganda'),
  af('ZM', 'Zambia', ['northern rhodesia']),
  af('ZW', 'Zimbabwe', ['rhodesia', 'southern rhodesia']),

  // Asia
  as('AF', 'Afghanistan'),
  as('AM', 'Armenia'),
  as('AZ', 'Azerbaijan'),
  as('BD', 'Bangladesh'),
  as('BT', 'Bhutan'),
  as('BN', 'Brunei'),
  as('KH', 'Cambodia', ['kampuchea']),
  as('CN', 'China', ['peoples republic of china', 'prc']),
  as('GE', 'Georgia'),
  as('IN', 'India'),
  as('ID', 'Indonesia'),
  as('JP', 'Japan', ['nippon']),
  as('KZ', 'Kazakhstan'),
  as('KP', 'North Korea', ['dprk', 'democratic peoples republic of korea']),
  as('KR', 'South Korea', ['korea', 'republic of korea']),
  as('KG', 'Kyrgyzstan'),
  as('LA', 'Laos', ['lao pdr', 'lao peoples democratic republic']),
  as('MY', 'Malaysia', ['malaya']),
  as('MV', 'Maldives'),
  as('MN', 'Mongolia'),
  as('MM', 'Myanmar', ['burma']),
  as('NP', 'Nepal'),
  as('PK', 'Pakistan'),
  as('PH', 'Philippines', ['filipinas', 'pilipinas']),
  as('SG', 'Singapore'),
  as('LK', 'Sri Lanka', ['ceylon']),
  as('TW', 'Taiwan', ['republic of china', 'chinese taipei', 'formosa']),
  as('TJ', 'Tajikistan'),
  as('TH', 'Thailand', ['siam']),
  as('TL', 'Timor-Leste', ['east timor']),
  as('TM', 'Turkmenistan'),
  as('UZ', 'Uzbekistan'),
  as('VN', 'Vietnam', ['viet nam']),

  // Oceania
  oc('AU', 'Australia'),
  oc('FJ', 'Fiji'),
  oc('KI', 'Kiribati'),
  oc('MH', 'Marshall Islands'),
  oc('FM', 'Micronesia', ['federated states of micronesia']),
  oc('NR', 'Nauru'),
  oc('NZ', 'New Zealand', ['aotearoa']),
  oc('PW', 'Palau'),
  oc('PG', 'Papua New Guinea'),
  oc('WS', 'Samoa', ['western samoa']),
  oc('SB', 'Solomon Islands'),
  oc('TO', 'Tonga'),
  oc('TV', 'Tuvalu'),
  oc('VU', 'Vanuatu', ['new hebrides']),
];

/** Normalized name/alias -> country code. Built once at module init. */
export const COUNTRY_ALIAS_MAP: Record<string, string> = {};
for (const country of WORLD_COUNTRIES) {
  const keys = [country.name, ...(country.aliases ?? [])];
  for (const key of keys) {
    const normalized = normalizeCountry(key);
    if (normalized) COUNTRY_ALIAS_MAP[normalized] = country.code;
  }
}

/** Resolve free-form country text ("Türkiye", "West Germany") to a code, or null. */
export function resolveCountryCode(raw: string | null | undefined): string | null {
  const normalized = normalizeCountry(raw);
  if (!normalized) return null;
  return COUNTRY_ALIAS_MAP[normalized] ?? null;
}

export function getCountryByCode(code: string): WorldCountry | undefined {
  return WORLD_COUNTRIES.find(country => country.code === code);
}
