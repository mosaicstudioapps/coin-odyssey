// The stylised world map both apps draw: continent blobs filled with a dot
// grid, and hand-placed country pins. Coordinates are in a 360 x 180 viewBox.
// Moved from mobile-app/src/components/design/WorldMap.tsx in Phase 1 of the
// web plan, unchanged.

export interface CountryPin {
  cx: number;
  cy: number;
  label: string;
}

export const MAP_CONTINENTS = [
  { cx:  72, cy:  58, rx: 40, ry: 28 },
  { cx:  62, cy:  88, rx: 14, ry:  8 },
  { cx: 108, cy: 128, rx: 18, ry: 32 },
  { cx: 178, cy:  58, rx: 22, ry: 12 },
  { cx: 192, cy: 108, rx: 24, ry: 30 },
  { cx: 210, cy:  82, rx: 14, ry:  8 },
  { cx: 248, cy:  68, rx: 48, ry: 24 },
  { cx: 245, cy:  92, rx: 14, ry: 12 },
  { cx: 275, cy: 100, rx: 14, ry:  6 },
  { cx: 298, cy:  72, rx:  6, ry:  8 },
  { cx: 298, cy: 142, rx: 18, ry: 10 },
];

/**
 * Hand-placed pins on the stylised dot map. ISO 3166-1 alpha-2 keys, so they
 * line up with resolveCountryCode() in the shared package.
 *
 * This is deliberately a subset — every pin is a pair of coordinates someone
 * positioned by eye against the continent blobs in MAP_CONTINENTS, not a projection. A
 * country the collection covers but this map has no pin for still counts
 * everywhere else in the app; it just doesn't light up here. Callers must not
 * treat "has a pin" as "is a country we know about".
 */
export const COUNTRY_PINS: Record<string, CountryPin> = {
  US: { cx:  70, cy:  72, label: 'United States' },
  CA: { cx:  72, cy:  48, label: 'Canada' },
  MX: { cx:  60, cy:  90, label: 'Mexico' },
  BR: { cx: 112, cy: 122, label: 'Brazil' },
  AR: { cx: 105, cy: 152, label: 'Argentina' },
  GB: { cx: 170, cy:  56, label: 'United Kingdom' },
  FR: { cx: 173, cy:  66, label: 'France' },
  DE: { cx: 180, cy:  60, label: 'Germany' },
  IT: { cx: 183, cy:  70, label: 'Italy' },
  ES: { cx: 168, cy:  72, label: 'Spain' },
  RU: { cx: 240, cy:  50, label: 'Russia' },
  CN: { cx: 262, cy:  78, label: 'China' },
  JP: { cx: 298, cy:  74, label: 'Japan' },
  IN: { cx: 240, cy:  96, label: 'India' },
  ZA: { cx: 198, cy: 138, label: 'South Africa' },
  EG: { cx: 198, cy:  88, label: 'Egypt' },
  AU: { cx: 298, cy: 142, label: 'Australia' },
  NZ: { cx: 320, cy: 152, label: 'New Zealand' },
  GR: { cx: 192, cy:  72, label: 'Greece' },
  TR: { cx: 202, cy:  72, label: 'Türkiye' },
  KE: { cx: 207, cy: 110, label: 'Kenya' },
  TH: { cx: 268, cy:  98, label: 'Thailand' },
  ID: { cx: 278, cy: 110, label: 'Indonesia' },
  PE: { cx:  98, cy: 130, label: 'Peru' },
  CL: { cx: 102, cy: 154, label: 'Chile' },
  PL: { cx: 188, cy:  60, label: 'Poland' },
  SE: { cx: 184, cy:  46, label: 'Sweden' },
  PH: { cx: 282, cy:  98, label: 'Philippines' },
  VN: { cx: 273, cy:  96, label: 'Vietnam' },
  KR: { cx: 287, cy:  76, label: 'South Korea' },
  MA: { cx: 170, cy:  85, label: 'Morocco' },
  NG: { cx: 184, cy: 108, label: 'Nigeria' },
  CH: { cx: 178, cy:  64, label: 'Switzerland' },
  NL: { cx: 178, cy:  56, label: 'Netherlands' },
};

export function inAnyContinent(x: number, y: number): boolean {
  for (const c of MAP_CONTINENTS) {
    const dx = (x - c.cx) / c.rx;
    const dy = (y - c.cy) / c.ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

/** Dot positions for the continents, with a little jitter so the grid looks hand-set. */
export function buildMapDots(step = 4): Array<[number, number]> {
  const dots: Array<[number, number]> = [];
  for (let y = 4; y < 180; y += step) {
    const offX = Math.round(y / step) % 2 === 0 ? 0 : step / 2;
    for (let x = 2 + offX; x < 360; x += step) {
      if (inAnyContinent(x, y)) {
        const jx = ((x * 13 + y * 7) % 5 - 2) * 0.18;
        const jy = ((x * 7 + y * 11) % 5 - 2) * 0.18;
        dots.push([x + jx, y + jy]);
      }
    }
  }
  return dots;
}
