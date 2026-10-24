// The public checklist pages: one per series album, built from the same
// verified date tables the in-app albums fill from (packages/shared). This
// file adds only what a public page needs on top: a URL, search copy, and a
// short introduction. The World album is a list of countries, not a dated
// series, so it has no checklist page.
import { buildAlbums, getSeriesById, getSpecificCoinById, type Album, type AlbumId } from '@coin-collecting/shared';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coinodyssey.app').replace(/\/$/, '');
export const APP_STORE_ID = '6799754448';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.coinodyssey.mobile';

interface ChecklistCopy {
  slug: string;
  /** The page's heading and the start of its title tag. */
  heading: string;
  /** One or two sentences for search results and link previews. */
  description: string;
  /** Short paragraphs above the list. Facts only; no prices or values. */
  intro: string[];
}

const COPY: Partial<Record<AlbumId, ChecklistCopy>> = {
  awq: {
    slug: 'american-women-quarters',
    heading: 'American Women Quarters checklist',
    description: 'Every American Women Quarter from 2022 to 2025: all 20 designs, with a box for each Philadelphia (P) and Denver (D) coin, in a printable checklist.',
    intro: [
      'From 2022 through 2025 the U.S. Mint issued five quarter designs a year honoring American women from many fields, for 20 designs in all.',
      'Tick off each design as you find it. Pocket change is a fine place to start.',
    ],
  },
  state_quarters: {
    slug: 'state-quarters',
    heading: '50 State Quarters checklist',
    description: 'All 50 State Quarters from 1999 to 2008, in release order, with a box for each Philadelphia (P) and Denver (D) coin, as a printable checklist.',
    intro: [
      'From 1999 through 2008 the U.S. Mint released five state designs a year, in the order the states joined the Union, starting with Delaware.',
      'The series started a generation of collectors with nothing more than pocket change and a folder.',
    ],
  },
  atb_quarters: {
    slug: 'america-the-beautiful-quarters',
    heading: 'America the Beautiful Quarters checklist',
    description: 'All 56 America the Beautiful Quarters from 2010 to 2021, one national park or site for every state, district, and territory, with P and D boxes for each.',
    intro: [
      'From 2010 through 2021 the U.S. Mint issued 56 quarter designs, each showing a national park or other national site, one for every state, the District of Columbia, and five territories.',
    ],
  },
  lincoln_wheat: {
    slug: 'lincoln-wheat-cents',
    heading: 'Lincoln Wheat Cents checklist',
    description: 'Every Lincoln Wheat cent date and mint mark from 1909 to 1958, including the 1909-S V.D.B., as a printable checklist.',
    intro: [
      'Victor David Brenner designed the Lincoln cent for the centennial of Lincoln’s birth in 1909. The two ears of wheat on the back gave the series its name until 1958.',
      'Look for the mint mark under the date: none for Philadelphia, D for Denver, S for San Francisco. In 1943 the cent was struck in zinc-coated steel to save copper for the war.',
    ],
  },
  lincoln_memorial: {
    slug: 'lincoln-memorial-cents',
    heading: 'Lincoln Memorial Cents checklist',
    description: 'Every Lincoln Memorial cent date and mint mark from 1959 to 2008, as a printable checklist.',
    intro: [
      'In 1959, Lincoln’s 150th birthday, the wheat ears gave way to Frank Gasparro’s view of the Lincoln Memorial. It stayed on the back of the cent for fifty years.',
      'In 1982 the cent changed from mostly copper to copper-plated zinc, so that year was struck both ways.',
    ],
  },
  lincoln_shield: {
    slug: 'lincoln-shield-cents',
    heading: 'Lincoln Shield Cents checklist',
    description: 'The four 2009 Lincoln Bicentennial cents and every Union Shield cent since 2010, by date and mint mark.',
    intro: [
      'For the bicentennial of Lincoln’s birth in 2009, the cent carried four backs telling the story of his life. Since 2010 it has shown a Union shield.',
    ],
  },
  morgan_dollars: {
    slug: 'morgan-dollars',
    heading: 'Morgan Silver Dollars checklist',
    description: 'Every Morgan silver dollar date and mint mark, 1878–1904 and 1921, including the Carson City (CC) issues, as a printable checklist.',
    intro: [
      'George T. Morgan’s silver dollar was struck from 1878 to 1904 and once more in 1921. It is one of the most collected American coins.',
      'The mint mark is on the back, under the wreath: CC for Carson City, O for New Orleans, S for San Francisco, D for Denver, and none for Philadelphia.',
    ],
  },
  peace_dollars: {
    slug: 'peace-dollars',
    heading: 'Peace Silver Dollars checklist',
    description: 'Every Peace silver dollar date and mint mark, 1921–1935, including the 1921 high relief, as a printable checklist.',
    intro: [
      'Anthony de Francisci designed the Peace dollar to mark the peace after World War I. It was struck from 1921 to 1928 and again in 1934 and 1935.',
      'The first year, 1921, was struck in high relief, which proved hard to strike and was lowered the next year.',
    ],
  },
  walking_liberty: {
    slug: 'walking-liberty-half-dollars',
    heading: 'Walking Liberty Half Dollars checklist',
    description: 'Every Walking Liberty half dollar date and mint mark from 1916 to 1947, as a printable checklist.',
    intro: [
      'Adolph A. Weinman’s Walking Liberty half dollar was struck from 1916 to 1947. His Liberty striding toward the sunrise was revived in 1986 for the American Silver Eagle.',
    ],
  },
  // 1.2 albums. Facts here come from the same checks as the date tables
  // (see each module in packages/shared/src/data).
  washington_quarters: {
    slug: 'washington-quarters',
    heading: 'Washington Quarters checklist',
    description: 'Every Washington quarter date and mint mark from 1932 to 1998, silver and clad, as a printable checklist.',
    intro: [
      'John Flanagan’s Washington quarter first appeared in 1932, for the 200th anniversary of Washington’s birth. It was 90% silver through 1964 and copper-nickel clad from 1965.',
      'There are no quarters dated 1933 or 1975. Quarters struck in 1975 and 1976 carry the bicentennial date 1776–1976 and a colonial drummer on the back.',
    ],
  },
  buffalo_nickels: {
    slug: 'buffalo-nickels',
    heading: 'Buffalo Nickels checklist',
    description: 'Every Buffalo nickel date and mint mark from 1913 to 1938, including both 1913 types, as a printable checklist.',
    intro: [
      'James Earle Fraser’s Indian Head nickel, with the bison on the back, was struck from 1913 to 1938.',
      'In 1913 the bison first stood on a raised mound (Type 1), then on a flat plain (Type 2), so that year has two slots at each mint. The mint mark is on the back, below the words FIVE CENTS.',
    ],
  },
  jefferson_nickels: {
    slug: 'jefferson-nickels',
    heading: 'Jefferson Nickels checklist',
    description: 'Every Jefferson nickel date and mint mark from 1938 on, including the wartime silver nickels and the Westward Journey designs.',
    intro: [
      'Felix Schlag’s Jefferson nickel, with Monticello on the back, replaced the Buffalo nickel in 1938.',
      'From late 1942 through 1945 nickels were struck in a silver alloy to save nickel for the war, with a large mint mark above Monticello, including the first P mint mark on a U.S. coin. In 2004 and 2005 the Westward Journey designs marked the Lewis and Clark expedition.',
    ],
  },
  mercury_dimes: {
    slug: 'mercury-dimes',
    heading: 'Mercury Dimes checklist',
    description: 'Every Mercury dime date and mint mark from 1916 to 1945, as a printable checklist.',
    intro: [
      'Adolph A. Weinman’s Winged Liberty Head dime was struck in silver from 1916 to 1945. The wings on Liberty’s cap led collectors to call it the Mercury dime.',
      'None were struck in 1922, 1932, or 1933. The mint mark is on the back, to the left of the fasces.',
    ],
  },
  roosevelt_dimes: {
    slug: 'roosevelt-dimes',
    heading: 'Roosevelt Dimes checklist',
    description: 'Every Roosevelt dime date and mint mark from 1946 on, silver and clad, as a printable checklist.',
    intro: [
      'The Roosevelt dime was introduced in 1946, the year after Franklin D. Roosevelt’s death, honoring his work founding the March of Dimes. It was 90% silver through 1964.',
      'Dimes from 1965 to 1967 carry no mint mark, and Philadelphia’s carry a P from 1980.',
    ],
  },
  kennedy_halves: {
    slug: 'kennedy-half-dollars',
    heading: 'Kennedy Half Dollars checklist',
    description: 'Every Kennedy half dollar date and mint mark from 1964 on, including the mint-set-only issues, as a printable checklist.',
    intro: [
      'The Kennedy half dollar was first struck in 1964, months after President Kennedy’s death. It was 90% silver in 1964 and 40% silver from 1965 to 1970.',
      'Some years were never released for circulation: the 1970-D and both 1987 coins came only in mint sets, and the 2002–2020 halves were made for collectors.',
    ],
  },
  native_american_dollars: {
    slug: 'sacagawea-native-american-dollars',
    heading: 'Sacagawea and Native American Dollars checklist',
    description: 'Every Sacagawea and Native American dollar from 2000 on, Philadelphia and Denver, with each year’s reverse theme.',
    intro: [
      'The golden Sacagawea dollar was introduced in 2000. Since 2009 its back has changed every year to honor a Native American contribution to the nation’s history.',
    ],
  },
  presidential_dollars: {
    slug: 'presidential-dollars',
    heading: 'Presidential Dollars checklist',
    description: 'All 40 Presidential dollars, 2007–2016 and 2020, with a box for each Philadelphia (P) and Denver (D) coin.',
    intro: [
      'From 2007 the U.S. Mint issued golden dollars honoring the presidents in order of office, four a year. Grover Cleveland has two coins, one for each term, and George H. W. Bush followed in 2020.',
      'From 2012 on they were made only for collectors, in rolls, bags, and sets.',
    ],
  },
};

export interface Checklist extends ChecklistCopy {
  album: Album;
  seriesDescription: string | null;
}

export function listChecklists(): Checklist[] {
  return buildAlbums()
    .filter(album => COPY[album.id])
    .map(album => ({
      ...COPY[album.id]!,
      album,
      seriesDescription: album.seriesId ? getSeriesById(album.seriesId)?.description ?? null : null,
    }));
}

export function getChecklist(slug: string): Checklist | undefined {
  return listChecklists().find(checklist => checklist.slug === slug);
}

/**
 * "1999–2008 · 50 designs · 100 coins, P and D", or "1878–1921 · 96 coins"
 * for a date-and-mint series.
 */
export function checklistCount(checklist: Checklist): string {
  const { album } = checklist;
  const marks = album.mintVariants;
  if (!marks) return `${album.subtitle} · ${album.totalSlots} coins`;
  return `${album.subtitle} · ${album.totalSlots} designs · ${album.totalSlots * marks.length} coins, ${marks.join(' and ')}`;
}

/** The short form for cards: "50 designs · P & D", or "96 coins". */
export function checklistShortCount(checklist: Checklist): string {
  const { album } = checklist;
  return album.mintVariants ? `${album.totalSlots} designs · ${album.mintVariants.join(' & ')}` : `${album.totalSlots} coins`;
}

export interface ChecklistRow {
  id: string;
  name: string;
  year: number | null;
  mint: string | null;
  detail: string | null;
}

const MINT_NAMES: Record<string, string> = {
  '': 'Philadelphia',
  P: 'Philadelphia',
  D: 'Denver',
  S: 'San Francisco',
  O: 'New Orleans',
  CC: 'Carson City',
  W: 'West Point',
};

/** One printable row per album slot. */
export function checklistRows(checklist: Checklist, slots = checklist.album.sections.flatMap(s => s.slots)): ChecklistRow[] {
  const seriesId = checklist.album.seriesId;
  return slots.map(slot => {
    const coin = seriesId ? getSpecificCoinById(seriesId, slot.id) : undefined;
    const match = slot.match;
    if (match.kind === 'yearMint') {
      return {
        id: slot.id,
        name: slot.label,
        year: match.year,
        // 1965-1967 coins carry no mark and came from every mint.
        mint: slot.sublabel === 'No mint mark' ? 'Any mint' : MINT_NAMES[match.mintMark] ?? match.mintMark,
        detail: slot.sublabel ?? null,
      };
    }
    if (match.kind === 'design') {
      return {
        id: slot.id,
        name: coin?.name ?? slot.label,
        year: match.year,
        mint: null,
        // The state for a park quarter. An honoree is already in the name.
        detail: slot.sublabel ?? null,
      };
    }
    return { id: slot.id, name: slot.label, year: null, mint: null, detail: null };
  });
}
