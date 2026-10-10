import React, { useMemo } from 'react';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Line,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { palette, fontFamily } from '../../theme';

const CONTINENTS = [
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
 * positioned by eye against the continent blobs above, not a projection. A
 * country the collection covers but this map has no pin for still counts
 * everywhere else in the app; it just doesn't light up here. Callers must not
 * treat "has a pin" as "is a country we know about".
 */
export const COUNTRY_PINS: Record<string, { cx: number; cy: number; label: string }> = {
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

function inAnyContinent(x: number, y: number): boolean {
  for (const c of CONTINENTS) {
    const dx = (x - c.cx) / c.rx;
    const dy = (y - c.cy) / c.ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

function buildDots(step = 4): Array<[number, number]> {
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

const CACHED_DOTS = buildDots(4);

interface Props {
  width?: number;
  collected?: string[];
  highlight?: string | null;
  interactive?: boolean;
  onPin?: (code: string) => void;
  size?: 'compact' | 'full';
}

export const WorldMap: React.FC<Props> = ({
  width = 320,
  collected = ['CA', 'GB', 'MX', 'JP', 'DE'],
  highlight = null,
  interactive = false,
  onPin,
  size = 'compact',
}) => {
  const aspect = 180 / 360;
  const height = width * aspect;
  const isCompact = size === 'compact';
  const dotR = isCompact ? 0.65 : 0.85;
  const pinR = isCompact ? 2.4 : 3.4;
  const collectedSet = useMemo(() => new Set(collected), [collected]);

  return (
    <Svg width={width} height={height} viewBox="0 0 360 180">
      <Defs>
        <RadialGradient id="pin-glow" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0%" stopColor={palette.gold} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={palette.gold} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="map-bg" cx="0.5" cy="0.4" rx="0.7" ry="0.7">
          <Stop offset="0%" stopColor={palette.mapBgWarmInner} stopOpacity={0.7} />
          <Stop offset="100%" stopColor={palette.bg} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={360} height={180} fill="url(#map-bg)" rx={6} />

      <Line
        x1={0}
        x2={360}
        y1={90}
        y2={90}
        stroke={palette.line2}
        strokeWidth={0.4}
        strokeDasharray="1.5 3"
      />
      <Line
        x1={180}
        x2={180}
        y1={0}
        y2={180}
        stroke={palette.line2}
        strokeWidth={0.4}
        strokeDasharray="1.5 3"
      />

      <G fill={palette.fg3} opacity={0.32}>
        {CACHED_DOTS.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={dotR} />
        ))}
      </G>

      {Object.entries(COUNTRY_PINS)
        .filter(([k]) => collectedSet.has(k))
        .map(([k, p]) => (
          <Circle key={`halo-${k}`} cx={p.cx} cy={p.cy} r={pinR * 3.2} fill="url(#pin-glow)" />
        ))}

      {Object.entries(COUNTRY_PINS).map(([k, p]) => {
        const isCollected = collectedSet.has(k);
        const isHL = k === highlight;
        return (
          <G key={`pin-${k}`} onPress={interactive && onPin ? () => onPin(k) : undefined}>
            <Circle
              cx={p.cx}
              cy={p.cy}
              r={isHL ? pinR * 1.6 : pinR}
              fill={isCollected ? palette.gold : palette.bg4}
              stroke={isCollected ? palette.goldRing : palette.line}
              strokeWidth={isCollected ? 0.6 : 0.4}
              opacity={isCollected ? 1 : 0.55}
            />
            {isCollected && (
              <Circle
                cx={p.cx}
                cy={p.cy}
                r={pinR * 0.45}
                fill={palette.pinDotBright}
                opacity={0.8}
              />
            )}
          </G>
        );
      })}

      {highlight && COUNTRY_PINS[highlight] && (
        <G>
          <Circle
            cx={COUNTRY_PINS[highlight].cx}
            cy={COUNTRY_PINS[highlight].cy}
            r={pinR * 3}
            fill="none"
            stroke={palette.gold}
            strokeWidth={0.6}
            opacity={0.45}
          />
          <SvgText
            x={COUNTRY_PINS[highlight].cx}
            y={COUNTRY_PINS[highlight].cy - pinR * 4}
            fontSize={isCompact ? 5.5 : 7}
            fontFamily={fontFamily.mono}
            fill={palette.gold}
            textAnchor="middle"
            letterSpacing={0.56}
          >
            {COUNTRY_PINS[highlight].label.toUpperCase()}
          </SvgText>
        </G>
      )}
    </Svg>
  );
};
