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
import { COUNTRY_PINS, buildMapDots } from '@coin-collecting/shared';
import { fontFamily, useTheme } from '../../theme';

// Pins and continent geometry live in packages/shared; re-exported for existing imports.
export { COUNTRY_PINS };

const CACHED_DOTS = buildMapDots(4);

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
  const { palette } = useTheme();
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
            stroke={palette.goldText}
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
