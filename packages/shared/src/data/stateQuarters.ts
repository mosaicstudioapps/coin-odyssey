import type { SpecificCoin } from '../types/series';

// 50 State Quarters Program (1999-2008), five states per year in order of
// statehood / release. No DC & U.S. Territories (2009) in v1.0.

export interface StateQuarterDef {
  id: string;
  state: string;
  year: number;
  /**
   * Normalized substrings that identify this design in a coin's name/series
   * text. Defaults to the state name. Washington (2007) must NOT use bare
   * "washington" — every state quarter's obverse says Washington, and generic
   * coin names like "Washington Quarter" would false-match.
   */
  keywords: string[];
}

function q(state: string, year: number, keywords?: string[]): StateQuarterDef {
  return {
    id: `${state.toLowerCase().replace(/\s+/g, '_')}_${year}`,
    state,
    year,
    keywords: keywords ?? [state.toLowerCase()],
  };
}

export const STATE_QUARTERS: StateQuarterDef[] = [
  // 1999
  q('Delaware', 1999),
  q('Pennsylvania', 1999),
  q('New Jersey', 1999),
  q('Georgia', 1999),
  q('Connecticut', 1999),
  // 2000
  q('Massachusetts', 2000),
  q('Maryland', 2000),
  q('South Carolina', 2000),
  q('New Hampshire', 2000),
  q('Virginia', 2000),
  // 2001
  q('New York', 2001),
  q('North Carolina', 2001),
  q('Rhode Island', 2001),
  q('Vermont', 2001),
  q('Kentucky', 2001),
  // 2002
  q('Tennessee', 2002),
  q('Ohio', 2002),
  q('Louisiana', 2002),
  q('Indiana', 2002),
  q('Mississippi', 2002),
  // 2003
  q('Illinois', 2003),
  q('Alabama', 2003),
  q('Maine', 2003),
  q('Missouri', 2003),
  q('Arkansas', 2003),
  // 2004
  q('Michigan', 2004),
  q('Florida', 2004),
  q('Texas', 2004),
  q('Iowa', 2004),
  q('Wisconsin', 2004),
  // 2005
  q('California', 2005),
  q('Minnesota', 2005),
  q('Oregon', 2005),
  q('Kansas', 2005),
  q('West Virginia', 2005),
  // 2006
  q('Nevada', 2006),
  q('Nebraska', 2006),
  q('Colorado', 2006),
  q('North Dakota', 2006),
  q('South Dakota', 2006),
  // 2007
  q('Montana', 2007),
  q('Washington', 2007, ['washington state', 'evergreen', 'rainier']),
  q('Idaho', 2007),
  q('Wyoming', 2007),
  q('Utah', 2007),
  // 2008
  q('Oklahoma', 2008),
  q('New Mexico', 2008),
  q('Arizona', 2008),
  q('Alaska', 2008),
  q('Hawaii', 2008),
];

export const STATE_QUARTER_COINS: SpecificCoin[] = STATE_QUARTERS.map(def => ({
  id: def.id,
  name: `${def.state} Quarter`,
  year: def.year,
  theme: def.state,
}));
