import type { CoinSeries, SpecificCoin } from '../types/series';

// Presidential $1 coins: 2007-2016, four a year in order of office (three in
// 2016), plus George H. W. Bush in 2020. 40 coins for 39 presidents: Grover
// Cleveland has one per term. Carter was living when the program ended.
//
// Verified 2026-10-24 against Wikipedia's "Presidential dollar coins" read as
// raw wikitext, cross-checked with CoinWeek's list. Every coin was struck at
// Philadelphia and Denver; from 2012 (Chester A. Arthur) only for collectors,
// in rolls, bags, and sets, rather than for circulation. Proofs (S), satin
// finishes, and edge-lettering errors are left out.

interface PresidentDef {
  key: string;
  name: string;
  year: number;
  /** Normalized words that name this president on a coin. */
  keywords: string[];
  /** Slot label: the surname, or more where two share it. */
  label: string;
}

const p = (key: string, name: string, year: number, label: string, keywords: string[]): PresidentDef => ({
  key,
  name,
  year,
  label,
  keywords,
});

const PRESIDENTS: PresidentDef[] = [
  p('washington', 'George Washington', 2007, 'Washington', ['washington']),
  p('john_adams', 'John Adams', 2007, 'J. Adams', ['john adams', 'adams']),
  p('jefferson', 'Thomas Jefferson', 2007, 'Jefferson', ['jefferson']),
  p('madison', 'James Madison', 2007, 'Madison', ['madison']),
  p('monroe', 'James Monroe', 2008, 'Monroe', ['monroe']),
  p('john_quincy_adams', 'John Quincy Adams', 2008, 'J. Q. Adams', ['quincy adams', 'adams']),
  p('jackson', 'Andrew Jackson', 2008, 'Jackson', ['jackson']),
  p('van_buren', 'Martin Van Buren', 2008, 'Van Buren', ['van buren']),
  p('william_henry_harrison', 'William Henry Harrison', 2009, 'W. H. Harrison', ['harrison']),
  p('tyler', 'John Tyler', 2009, 'Tyler', ['tyler']),
  p('polk', 'James K. Polk', 2009, 'Polk', ['polk']),
  p('taylor', 'Zachary Taylor', 2009, 'Taylor', ['taylor']),
  p('fillmore', 'Millard Fillmore', 2010, 'Fillmore', ['fillmore']),
  p('pierce', 'Franklin Pierce', 2010, 'Pierce', ['pierce']),
  p('buchanan', 'James Buchanan', 2010, 'Buchanan', ['buchanan']),
  p('lincoln', 'Abraham Lincoln', 2010, 'Lincoln', ['lincoln']),
  p('andrew_johnson', 'Andrew Johnson', 2011, 'A. Johnson', ['johnson']),
  p('grant', 'Ulysses S. Grant', 2011, 'Grant', ['grant']),
  p('hayes', 'Rutherford B. Hayes', 2011, 'Hayes', ['hayes']),
  p('garfield', 'James A. Garfield', 2011, 'Garfield', ['garfield']),
  p('arthur', 'Chester A. Arthur', 2012, 'Arthur', ['arthur']),
  p('cleveland_first', 'Grover Cleveland (first term)', 2012, 'Cleveland I', ['cleveland']),
  p('benjamin_harrison', 'Benjamin Harrison', 2012, 'B. Harrison', ['harrison']),
  p('cleveland_second', 'Grover Cleveland (second term)', 2012, 'Cleveland II', ['cleveland']),
  p('mckinley', 'William McKinley', 2013, 'McKinley', ['mckinley']),
  p('theodore_roosevelt', 'Theodore Roosevelt', 2013, 'T. Roosevelt', ['roosevelt']),
  p('taft', 'William Howard Taft', 2013, 'Taft', ['taft']),
  p('wilson', 'Woodrow Wilson', 2013, 'Wilson', ['wilson']),
  p('harding', 'Warren G. Harding', 2014, 'Harding', ['harding']),
  p('coolidge', 'Calvin Coolidge', 2014, 'Coolidge', ['coolidge']),
  p('hoover', 'Herbert Hoover', 2014, 'Hoover', ['hoover']),
  p('franklin_roosevelt', 'Franklin D. Roosevelt', 2014, 'F. Roosevelt', ['roosevelt']),
  p('truman', 'Harry S. Truman', 2015, 'Truman', ['truman']),
  p('eisenhower', 'Dwight D. Eisenhower', 2015, 'Eisenhower', ['eisenhower']),
  p('kennedy', 'John F. Kennedy', 2015, 'Kennedy', ['kennedy']),
  p('lyndon_johnson', 'Lyndon B. Johnson', 2015, 'L. Johnson', ['johnson']),
  p('nixon', 'Richard Nixon', 2016, 'Nixon', ['nixon']),
  p('ford', 'Gerald Ford', 2016, 'Ford', ['ford']),
  p('reagan', 'Ronald Reagan', 2016, 'Reagan', ['reagan']),
  p('george_hw_bush', 'George H. W. Bush', 2020, 'G. H. W. Bush', ['bush']),
];

export const PRESIDENTIAL_SLOT_META: Record<string, { label: string; keywords: string[] }> = Object.fromEntries(
  PRESIDENTS.map(def => [`presidential_${def.key}_${def.year}`, { label: def.label, keywords: def.keywords }])
);

const specificCoins: SpecificCoin[] = PRESIDENTS.map(def => ({
  id: `presidential_${def.key}_${def.year}`,
  name: `${def.name} Presidential Dollar`,
  year: def.year,
  honoree: def.name,
}));

export const PRESIDENTIAL_DOLLAR_SERIES: CoinSeries = {
  id: 'presidential_dollars',
  name: 'Presidential Dollars',
  shortName: 'Presidential Dollars',
  country: 'United States',
  denomination: 'Dollar',
  startYear: 2007,
  endYear: 2020,
  description: 'Golden dollars honoring the presidents in order of office, four a year from 2007',
  category: 'commemorative',
  mintMarks: ['P', 'D'],
  specificCoins,
};
