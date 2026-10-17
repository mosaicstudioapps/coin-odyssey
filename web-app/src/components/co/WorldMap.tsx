'use client';

// The dotted world map with a pin per country, drawn from the shared geometry
// (packages/shared, worldMapGeometry.ts) like the mobile map.
import { useId, useMemo } from 'react';
import { COUNTRY_PINS, buildMapDots } from '@coin-collecting/shared';

const DOTS = buildMapDots(4);

export function WorldMap({
  collected,
  highlight = null,
  onPin,
  size = 'compact',
  className,
}: {
  collected: string[];
  highlight?: string | null;
  /** Makes collected and uncollected pins clickable. */
  onPin?: (code: string) => void;
  size?: 'compact' | 'full';
  className?: string;
}) {
  const id = useId();
  const glowId = `${id}-glow`;
  const bgId = `${id}-bg`;
  const compact = size === 'compact';
  const dotR = compact ? 0.65 : 0.85;
  const pinR = compact ? 2.4 : 3.4;
  const collectedSet = useMemo(() => new Set(collected), [collected]);
  const focus = highlight ? COUNTRY_PINS[highlight] : undefined;

  return (
    <svg viewBox="0 0 360 180" className={className} width="100%" role="img" aria-label={`World map, ${collectedSet.size} countries collected`}>
      <defs>
        <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" style={{ stopColor: 'var(--co-gold)', stopOpacity: 0.55 }} />
          <stop offset="100%" style={{ stopColor: 'var(--co-gold)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={bgId} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" style={{ stopColor: 'var(--co-map-bg-warm-inner)', stopOpacity: 0.7 }} />
          <stop offset="100%" style={{ stopColor: 'var(--co-bg)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={360} height={180} rx={6} fill={`url(#${bgId})`} />
      <line x1={0} x2={360} y1={90} y2={90} stroke="var(--co-line2)" strokeWidth={0.4} strokeDasharray="1.5 3" />
      <line x1={180} x2={180} y1={0} y2={180} stroke="var(--co-line2)" strokeWidth={0.4} strokeDasharray="1.5 3" />

      <g fill="var(--co-fg3)" opacity={0.32}>
        {DOTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={dotR} />
        ))}
      </g>

      {Object.entries(COUNTRY_PINS)
        .filter(([code]) => collectedSet.has(code))
        .map(([code, pin]) => (
          <circle key={`halo-${code}`} cx={pin.cx} cy={pin.cy} r={pinR * 3.2} fill={`url(#${glowId})`} />
        ))}

      {Object.entries(COUNTRY_PINS).map(([code, pin]) => {
        const isCollected = collectedSet.has(code);
        const isFocus = code === highlight;
        return (
          <g
            key={`pin-${code}`}
            onClick={onPin ? () => onPin(code) : undefined}
            className={onPin ? 'cursor-pointer' : undefined}
          >
            {onPin && <title>{pin.label}</title>}
            {/* A larger, invisible target so small pins are easy to click. */}
            {onPin && <circle cx={pin.cx} cy={pin.cy} r={pinR * 2.2} fill="transparent" />}
            <circle
              cx={pin.cx}
              cy={pin.cy}
              r={isFocus ? pinR * 1.6 : pinR}
              fill={isCollected ? 'var(--co-gold)' : 'var(--co-bg4)'}
              stroke={isCollected ? 'var(--co-gold-ring)' : 'var(--co-line)'}
              strokeWidth={isCollected ? 0.6 : 0.4}
              opacity={isCollected ? 1 : 0.55}
            />
            {isCollected && <circle cx={pin.cx} cy={pin.cy} r={pinR * 0.45} fill="var(--co-pin-dot-bright)" opacity={0.8} />}
          </g>
        );
      })}

      {focus && (
        <g pointerEvents="none">
          <circle cx={focus.cx} cy={focus.cy} r={pinR * 3} fill="none" stroke="var(--co-gold-text)" strokeWidth={0.6} opacity={0.45} />
          <text
            x={focus.cx}
            y={focus.cy - pinR * 4}
            fontSize={compact ? 5.5 : 7}
            fill="var(--co-gold)"
            textAnchor="middle"
            letterSpacing={0.56}
            className="font-mono"
          >
            {focus.label.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}
