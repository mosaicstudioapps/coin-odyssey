import { COIN_SERIES } from '../types/series';
import type { Album, AlbumSection, AlbumSlot } from '../types/album';
import { STATE_QUARTERS } from './stateQuarters';
import { ATB_QUARTERS } from './atbQuarters';
import {
  LINCOLN_WHEAT_CENTS,
  LINCOLN_MEMORIAL_CENTS,
  buildShieldCents,
} from './lincolnCents';
import type { DateMintDef } from './dateMintRuns';
import { MORGAN_DOLLARS, PEACE_DOLLARS } from './silverDollars';
import { WALKING_LIBERTY_HALVES } from './walkingLibertyHalves';
import { WORLD_COUNTRIES, WORLD_REGIONS } from './worldCountries';
import { normalizeText } from '../utils/normalize';

// Assembles the ten albums from the data modules. Pure and cheap (~900
// slots); cached per currentYear so screens can call it freely.
//
// LincolnCentDef is structurally assignable to DateMintDef, so the cent
// volumes and the classic silver runs share the slot/section helpers below.

/**
 * Short slot labels + distinctive match keywords per AWQ design. Keywords are
 * surname-based (year-gated, so cross-year collisions are impossible); bare
 * full-honoree fallback would miss user-entered names like "Sally Ride
 * Quarter" when the official honoree is "Dr. Sally Ride".
 */
const AWQ_SLOT_META: Record<string, { label: string; keywords: string[] }> = {
  maya_angelou_2022: { label: 'Angelou', keywords: ['angelou'] },
  dr_sally_ride_2022: { label: 'Ride', keywords: ['sally ride'] },
  wilma_mankiller_2022: { label: 'Mankiller', keywords: ['mankiller'] },
  nina_otero_warren_2022: { label: 'Otero-Warren', keywords: ['otero'] },
  anna_may_wong_2022: { label: 'Wong', keywords: ['wong'] },
  bessie_coleman_2023: { label: 'Coleman', keywords: ['coleman'] },
  edith_kanaka_ole_2023: { label: 'Kanakaʻole', keywords: ['kanaka'] },
  eleanor_roosevelt_2023: { label: 'Roosevelt', keywords: ['roosevelt'] },
  jovita_idar_2023: { label: 'Idár', keywords: ['idar'] },
  maria_tallchief_2023: { label: 'Tallchief', keywords: ['tallchief'] },
  reverend_pauli_murray_2024: { label: 'Murray', keywords: ['murray'] },
  patsy_takemoto_mink_2024: { label: 'Mink', keywords: ['mink'] },
  mary_edwards_walker_2024: { label: 'Walker', keywords: ['walker'] },
  celia_cruz_2024: { label: 'Cruz', keywords: ['cruz'] },
  zitkala_sa_2024: { label: 'Zitkala-Ša', keywords: ['zitkala'] },
  ida_b_wells_2025: { label: 'Wells', keywords: ['wells'] },
  juliette_gordon_low_2025: { label: 'Gordon Low', keywords: ['juliette', 'gordon low'] },
  althea_gibson_2025: { label: 'Gibson', keywords: ['gibson'] },
  kalpana_chawla_2025: { label: 'Chawla', keywords: ['chawla'] },
  fannie_lou_hamer_2025: { label: 'Hamer', keywords: ['hamer'] },
};

function totalSlots(sections: AlbumSection[]): number {
  return sections.reduce((sum, section) => sum + section.slots.length, 0);
}

function groupByYear(slots: Array<AlbumSlot & { year: number }>, idPrefix: string): AlbumSection[] {
  const byYear = new Map<number, AlbumSlot[]>();
  for (const { year, ...slot } of slots) {
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(slot);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, yearSlots]) => ({ id: `${idPrefix}_${year}`, title: `${year}`, slots: yearSlots }));
}

function dateMintSlot(def: DateMintDef): AlbumSlot {
  return {
    id: def.id,
    label: def.name,
    ...(def.sublabel ? { sublabel: def.sublabel } : {}),
    match: {
      kind: 'yearMint',
      year: def.year,
      mintMark: def.mintMark,
      ...(def.keywords ? { keywords: def.keywords } : {}),
      ...(def.excludeKeywords ? { excludeKeywords: def.excludeKeywords } : {}),
    },
  };
}

function groupByDecade(defs: DateMintDef[], idPrefix: string): AlbumSection[] {
  const byDecade = new Map<number, AlbumSlot[]>();
  for (const def of defs) {
    const decade = Math.floor(def.year / 10) * 10;
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade)!.push(dateMintSlot(def));
  }
  return [...byDecade.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, slots]) => ({ id: `${idPrefix}_${decade}s`, title: `${decade}s`, slots }));
}

function buildAwqAlbum(): Album {
  const series = COIN_SERIES.find(s => s.id === 'american_women_quarters')!;
  const slots = series.specificCoins.map(coin => {
    const meta = AWQ_SLOT_META[coin.id];
    return {
      id: coin.id,
      label: meta?.label ?? coin.honoree ?? coin.name,
      year: coin.year,
      match: {
        kind: 'design' as const,
        year: coin.year,
        keywords: meta?.keywords ?? [normalizeText(coin.honoree ?? coin.name)],
      },
    };
  });
  const sections = groupByYear(slots, 'awq');
  return {
    id: 'awq',
    title: 'American Women Quarters',
    subtitle: '2022–2025',
    kind: 'series',
    seriesId: series.id,
    discTone: 'silver',
    sections,
    totalSlots: totalSlots(sections),
  };
}

function buildStateQuartersAlbum(): Album {
  const slots = STATE_QUARTERS.map(def => ({
    id: def.id,
    label: def.state,
    year: def.year,
    match: { kind: 'design' as const, year: def.year, keywords: def.keywords },
  }));
  const sections = groupByYear(slots, 'sq');
  return {
    id: 'state_quarters',
    title: '50 State Quarters',
    subtitle: '1999–2008',
    kind: 'series',
    seriesId: 'state_quarters',
    discTone: 'silver',
    sections,
    totalSlots: totalSlots(sections),
  };
}

function buildAtbAlbum(): Album {
  const slots = ATB_QUARTERS.map(def => ({
    id: def.id,
    label: def.site,
    // The jurisdiction is the useful second line, except where the site is
    // named after it (American Samoa) and would just repeat itself.
    ...(def.jurisdiction === def.site ? {} : { sublabel: def.jurisdiction }),
    year: def.year,
    match: { kind: 'design' as const, year: def.year, keywords: def.keywords },
  }));
  const sections = groupByYear(slots, 'atb');
  return {
    id: 'atb_quarters',
    title: 'America the Beautiful',
    subtitle: '2010–2021',
    kind: 'series',
    seriesId: 'america_beautiful_quarters',
    discTone: 'silver',
    sections,
    totalSlots: totalSlots(sections),
  };
}

/** Morgan / Peace / Walking Liberty — classic date-and-mint runs by decade. */
function buildDateMintAlbum(
  id: 'morgan_dollars' | 'peace_dollars' | 'walking_liberty',
  title: string,
  subtitle: string,
  seriesId: string,
  defs: DateMintDef[],
): Album {
  const sections = groupByDecade(defs, id);
  return {
    id,
    title,
    subtitle,
    kind: 'series',
    seriesId,
    discTone: 'silver',
    sections,
    totalSlots: totalSlots(sections),
  };
}

function buildLincolnAlbum(
  id: 'lincoln_wheat' | 'lincoln_memorial',
  title: string,
  subtitle: string,
  seriesId: string,
  defs: DateMintDef[],
): Album {
  const sections = groupByDecade(defs, id);
  return {
    id,
    title,
    subtitle,
    kind: 'series',
    seriesId,
    discTone: 'copper',
    sections,
    totalSlots: totalSlots(sections),
  };
}

function buildShieldAlbum(currentYear: number): Album {
  const defs = buildShieldCents(currentYear);
  const bicentennial = defs.filter(def => def.year === 2009);
  const shield = defs.filter(def => def.year > 2009);
  const sections: AlbumSection[] = [
    { id: 'lincoln_shield_2009', title: '2009 Bicentennial', slots: bicentennial.map(dateMintSlot) },
    ...groupByDecade(shield, 'lincoln_shield'),
  ];
  return {
    id: 'lincoln_shield',
    title: 'Lincoln Cents · Shield',
    subtitle: `2009–${currentYear}`,
    kind: 'series',
    seriesId: 'lincoln_shield_cents',
    discTone: 'copper',
    sections,
    totalSlots: totalSlots(sections),
  };
}

function buildWorldAlbum(): Album {
  const sections = WORLD_REGIONS.map(regionName => ({
    id: `world_${normalizeText(regionName).replace(/ /g, '_')}`,
    title: regionName,
    slots: WORLD_COUNTRIES.filter(country => country.region === regionName).map(country => ({
      id: `country_${country.code}`,
      label: country.name,
      match: { kind: 'country' as const, countryCode: country.code },
    })),
  }));
  return {
    id: 'world',
    title: 'World Coins',
    subtitle: 'One coin from every country',
    kind: 'world',
    discTone: 'gold',
    sections,
    totalSlots: totalSlots(sections),
  };
}

const albumCache = new Map<number, Album[]>();

export function buildAlbums(currentYear: number = new Date().getFullYear()): Album[] {
  const cached = albumCache.get(currentYear);
  if (cached) return cached;
  const albums: Album[] = [
    buildAwqAlbum(),
    buildStateQuartersAlbum(),
    buildAtbAlbum(),
    buildLincolnAlbum(
      'lincoln_wheat',
      'Lincoln Cents · Wheat',
      '1909–1958',
      'lincoln_wheat_cents',
      LINCOLN_WHEAT_CENTS,
    ),
    buildLincolnAlbum(
      'lincoln_memorial',
      'Lincoln Cents · Memorial',
      '1959–2008',
      'lincoln_memorial_cents',
      LINCOLN_MEMORIAL_CENTS,
    ),
    buildShieldAlbum(currentYear),
    buildDateMintAlbum(
      'morgan_dollars',
      'Morgan Dollars',
      '1878–1921',
      'morgan_dollars',
      MORGAN_DOLLARS,
    ),
    buildDateMintAlbum(
      'peace_dollars',
      'Peace Dollars',
      '1921–1935',
      'peace_dollars',
      PEACE_DOLLARS,
    ),
    buildDateMintAlbum(
      'walking_liberty',
      'Walking Liberty Halves',
      '1916–1947',
      'walking_liberty_halves',
      WALKING_LIBERTY_HALVES,
    ),
    buildWorldAlbum(),
  ];
  albumCache.set(currentYear, albums);
  return albums;
}

export function getAlbumById(id: string, currentYear?: number): Album | undefined {
  return buildAlbums(currentYear).find(album => album.id === id);
}
