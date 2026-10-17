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
    description: 'Every American Women Quarter from 2022 to 2025, by year: all 20 designs honoring American women, in a printable checklist.',
    intro: [
      'From 2022 through 2025 the U.S. Mint issued five quarter designs a year honoring American women from many fields, for 20 designs in all.',
      'Tick off each design as you find it. Pocket change is a fine place to start.',
    ],
  },
  state_quarters: {
    slug: 'state-quarters',
    heading: '50 State Quarters checklist',
    description: 'All 50 State Quarters from 1999 to 2008, in release order, as a printable checklist.',
    intro: [
      'From 1999 through 2008 the U.S. Mint released five state designs a year, in the order the states joined the Union, starting with Delaware.',
      'The series started a generation of collectors with nothing more than pocket change and a folder.',
    ],
  },
  atb_quarters: {
    slug: 'america-the-beautiful-quarters',
    heading: 'America the Beautiful Quarters checklist',
    description: 'All 56 America the Beautiful Quarters from 2010 to 2021, one national park or site for every state, district, and territory.',
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
        mint: MINT_NAMES[match.mintMark] ?? match.mintMark,
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
