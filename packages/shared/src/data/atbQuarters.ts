import type { CoinSeries, SpecificCoin } from '../types/series';
import { normalizeText } from '../utils/normalize';

// America the Beautiful Quarters (2010-2021) — 56 designs honouring a national
// park or site in each state, district and territory, five per year plus the
// lone 2021 Tuskegee Airmen issue that closed the program.
//
// Slotted by design like the 50 State Quarters album (one slot per site, mint
// mark ignored) rather than by date/mint run, so the two quarter albums read
// the same way. Years never overlap State Quarters (1999-2008) or American
// Women Quarters (2022-2025), so keywords only need to be distinct within
// their own release year.

export interface AtbQuarterDef {
  id: string;
  /** Park or site name — the slot label. */
  site: string;
  /** State, district or territory — the slot sublabel. */
  jurisdiction: string;
  year: number;
  /**
   * Normalized substrings that identify this design in a coin's name/series
   * text. Includes the jurisdiction, since collectors often file these by
   * state. Never bare "washington" — every quarter obverse says Washington.
   */
  keywords: string[];
}

function atb(
  site: string,
  jurisdiction: string,
  year: number,
  keywords: string[],
): AtbQuarterDef {
  const jurisdictionKeyword = normalizeText(jurisdiction);
  return {
    id: `${normalizeText(site).replace(/ /g, '_')}_${year}`,
    site,
    jurisdiction,
    year,
    // Olympic (2011) is in Washington; bare "washington" would false-match the
    // obverse legend that every quarter carries.
    keywords:
      jurisdictionKeyword === 'washington' ? keywords : [...keywords, jurisdictionKeyword],
  };
}

export const ATB_QUARTERS: AtbQuarterDef[] = [
  // 2010
  atb('Hot Springs', 'Arkansas', 2010, ['hot springs']),
  atb('Yellowstone', 'Wyoming', 2010, ['yellowstone']),
  atb('Yosemite', 'California', 2010, ['yosemite']),
  atb('Grand Canyon', 'Arizona', 2010, ['grand canyon']),
  atb('Mount Hood', 'Oregon', 2010, ['mount hood', 'mt hood']),
  // 2011
  atb('Gettysburg', 'Pennsylvania', 2011, ['gettysburg']),
  atb('Glacier', 'Montana', 2011, ['glacier']),
  atb('Olympic', 'Washington', 2011, ['olympic', 'washington state']),
  atb('Vicksburg', 'Mississippi', 2011, ['vicksburg']),
  atb('Chickasaw', 'Oklahoma', 2011, ['chickasaw']),
  // 2012
  atb('El Yunque', 'Puerto Rico', 2012, ['el yunque', 'yunque']),
  atb('Chaco Culture', 'New Mexico', 2012, ['chaco']),
  atb('Acadia', 'Maine', 2012, ['acadia']),
  atb('Hawaii Volcanoes', 'Hawaii', 2012, ['hawaii volcanoes', 'volcanoes']),
  atb('Denali', 'Alaska', 2012, ['denali']),
  // 2013
  atb('White Mountain', 'New Hampshire', 2013, ['white mountain']),
  atb("Perry's Victory", 'Ohio', 2013, ['perry']),
  atb('Great Basin', 'Nevada', 2013, ['great basin']),
  atb('Fort McHenry', 'Maryland', 2013, ['fort mchenry', 'mchenry']),
  atb('Mount Rushmore', 'South Dakota', 2013, ['rushmore']),
  // 2014
  atb('Great Smoky Mountains', 'Tennessee', 2014, ['great smoky', 'smoky']),
  atb('Shenandoah', 'Virginia', 2014, ['shenandoah']),
  atb('Arches', 'Utah', 2014, ['arches']),
  atb('Great Sand Dunes', 'Colorado', 2014, ['sand dunes']),
  atb('Everglades', 'Florida', 2014, ['everglades']),
  // 2015
  atb('Homestead', 'Nebraska', 2015, ['homestead']),
  atb('Kisatchie', 'Louisiana', 2015, ['kisatchie']),
  atb('Blue Ridge Parkway', 'North Carolina', 2015, ['blue ridge']),
  atb('Bombay Hook', 'Delaware', 2015, ['bombay hook', 'bombay']),
  atb('Saratoga', 'New York', 2015, ['saratoga']),
  // 2016
  atb('Shawnee', 'Illinois', 2016, ['shawnee']),
  atb('Cumberland Gap', 'Kentucky', 2016, ['cumberland gap']),
  atb('Harpers Ferry', 'West Virginia', 2016, ['harpers ferry', 'harpers']),
  atb('Theodore Roosevelt', 'North Dakota', 2016, ['theodore roosevelt']),
  atb('Fort Moultrie', 'South Carolina', 2016, ['moultrie', 'fort sumter']),
  // 2017
  atb('Effigy Mounds', 'Iowa', 2017, ['effigy']),
  atb('Frederick Douglass', 'District of Columbia', 2017, ['douglass']),
  atb('Ozark Riverways', 'Missouri', 2017, ['ozark']),
  atb('Ellis Island', 'New Jersey', 2017, ['ellis island', 'ellis']),
  atb('George Rogers Clark', 'Indiana', 2017, ['george rogers clark', 'rogers clark']),
  // 2018
  atb('Pictured Rocks', 'Michigan', 2018, ['pictured rocks']),
  atb('Apostle Islands', 'Wisconsin', 2018, ['apostle']),
  atb('Voyageurs', 'Minnesota', 2018, ['voyageurs']),
  atb('Cumberland Island', 'Georgia', 2018, ['cumberland island']),
  atb('Block Island', 'Rhode Island', 2018, ['block island']),
  // 2019
  atb('Lowell', 'Massachusetts', 2019, ['lowell']),
  atb('American Memorial Park', 'Northern Mariana Islands', 2019, ['american memorial', 'mariana']),
  atb('War in the Pacific', 'Guam', 2019, ['war in the pacific']),
  atb('San Antonio Missions', 'Texas', 2019, ['san antonio', 'missions']),
  atb('River of No Return', 'Idaho', 2019, ['river of no return', 'frank church']),
  // 2020
  atb('American Samoa', 'American Samoa', 2020, ['national park of american samoa', 'samoa']),
  atb('Weir Farm', 'Connecticut', 2020, ['weir farm', 'weir']),
  atb('Salt River Bay', 'U.S. Virgin Islands', 2020, ['salt river', 'virgin islands']),
  atb('Marsh-Billings-Rockefeller', 'Vermont', 2020, ['marsh billings', 'rockefeller']),
  atb('Tallgrass Prairie', 'Kansas', 2020, ['tallgrass']),
  // 2021
  atb('Tuskegee Airmen', 'Alabama', 2021, ['tuskegee']),
];

export const ATB_QUARTER_COINS: SpecificCoin[] = ATB_QUARTERS.map(def => ({
  id: def.id,
  name: `${def.site} Quarter`,
  year: def.year,
  description: def.jurisdiction,
  theme: def.site,
}));

export const ATB_QUARTER_SERIES: CoinSeries = {
  id: 'america_beautiful_quarters',
  name: 'America the Beautiful Quarters',
  shortName: 'ATB Quarters',
  country: 'United States',
  denomination: 'Quarter',
  startYear: 2010,
  endYear: 2021,
  description: 'National parks and sites from every state, district and territory',
  category: 'commemorative',
  mintMarks: ['P', 'D', 'S'],
  specificCoins: ATB_QUARTER_COINS,
};
