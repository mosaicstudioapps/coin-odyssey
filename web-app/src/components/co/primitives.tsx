// Web versions of the mobile design components (mobile-app/src/components/design).
// Same sizes, spacing, and tokens, so a screen reads the same on both.
import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Mono uppercase label above a section or value. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('co-eyebrow', className)}>{children}</p>;
}

/** The app's card: raised surface, hairline border. `quiet` drops the fill. */
export function Card({
  quiet,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { quiet?: boolean }) {
  return (
    <div
      className={cn('rounded-md border border-co-line', quiet ? 'bg-transparent' : 'bg-co-bg2', className)}
      {...rest}
    />
  );
}

export function Stat({
  eyebrow,
  value,
  suffix,
  delta,
  deltaDir = 'up',
}: {
  eyebrow: string;
  value: string;
  suffix?: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-co-fg3">{eyebrow}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[28px] leading-none tracking-[-0.02em] text-co-fg">{value}</span>
        {suffix && <span className="font-mono text-[11px] text-co-fg3">{suffix}</span>}
      </div>
      {delta && (
        <p className={cn('font-mono text-[11px]', deltaDir === 'down' ? 'text-co-c-low' : 'text-co-c-high')}>
          {deltaDir === 'up' ? '▲' : '▼'} {delta}
        </p>
      )}
    </Card>
  );
}

export type ConfLevel = 'h' | 'm' | 'l' | 'n';
const CONF_DOT: Record<ConfLevel, string> = {
  h: 'bg-co-c-high',
  m: 'bg-co-c-med',
  l: 'bg-co-c-low',
  n: 'bg-co-c-none',
};
const CONF_LABEL: Record<ConfLevel, string> = { h: 'HIGH', m: 'MED', l: 'LOW', n: '—' };

/** Confidence chip on a scan result field. */
export function ConfBadge({ level = 'h', score, label }: { level?: ConfLevel; score?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full border border-co-line bg-co-bg3 py-[3px] pl-1.5 pr-[7px]">
      <span className={cn('h-1.5 w-1.5 rounded-full', CONF_DOT[level])} aria-hidden />
      <span className="font-mono text-[9.5px] tracking-[0.08em] text-co-fg2">
        {label || CONF_LABEL[level]}
        {score != null && <span className="opacity-70">·{score}</span>}
      </span>
    </span>
  );
}

export function ProgressBar({ value, height = 4, label }: { value: number; height?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-co-bg4"
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className="h-full rounded-full bg-co-gold" style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export type DiscTone = 'gold' | 'silver' | 'copper';
const TONE_VARS: Record<DiscTone, [string, string, string]> = {
  gold: ['--co-gold-coin-hi', '--co-gold-coin-mid', '--co-gold-coin-lo'],
  silver: ['--co-silver-hi', '--co-silver-mid', '--co-silver-lo'],
  copper: ['--co-copper-hi', '--co-copper-mid', '--co-copper-lo'],
};

/** The coin disc: a metal gradient with a dashed inner ring and a short label, or a photo. */
export function CoinDisc({
  size = 56,
  label = 'OBV',
  tone = 'gold',
  imageSrc,
  imageAlt = '',
}: {
  size?: number;
  label?: string;
  tone?: DiscTone;
  imageSrc?: string;
  imageAlt?: string;
}) {
  const gradientId = useId();
  const [hi, mid, lo] = TONE_VARS[tone];
  const inset = size * 0.08;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-co-bg3"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0" aria-hidden>
        <defs>
          <radialGradient id={gradientId} cx="30%" cy="25%" r="100%" fx="30%" fy="25%">
            <stop offset="0%" style={{ stopColor: `var(${hi})` }} />
            <stop offset="45%" style={{ stopColor: `var(${mid})` }} />
            <stop offset="100%" style={{ stopColor: `var(${lo})` }} />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
      </svg>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URLs from storage
        <img src={imageSrc} alt={imageAlt} className="absolute inset-0 h-full w-full rounded-full object-cover" />
      ) : (
        <>
          <span
            className="absolute rounded-full border border-dashed border-co-disc-ring"
            style={{ inset }}
            aria-hidden
          />
          <span
            className="relative font-mono uppercase text-co-disc-label"
            style={{ fontSize: Math.max(7.5, size * 0.13), letterSpacing: '0.1em' }}
          >
            {label}
          </span>
        </>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-full border border-co-disc-highlight" aria-hidden />
    </span>
  );
}

/** Small area chart for the dashboard's growth card. Draws nothing under two points. */
export function MiniChart({ data, width = 320, height = 110 }: { data: number[]; width?: number; height?: number }) {
  const fillId = useId();
  if (data.length < 2) return <div style={{ height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const topPad = 14;
  const bottomPad = 14;
  const inner = height - topPad - bottomPad;
  const points = data.map((v, i) => [i * stepX, height - bottomPad - ((v - min) / range) * inner] as const);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  // A line, not a fill, so it takes the deeper gold that reads on light paper.
  const color = 'var(--co-gold-text)';
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(p => {
        const y = topPad + p * inner;
        return <line key={p} x1={0} x2={width} y1={y} y2={y} stroke="var(--co-line2)" strokeWidth={1} />;
      })}
      <path d={`${path} L ${width},${height} L 0,${height} Z`} fill={`url(#${fillId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--co-bg)" stroke={color} strokeWidth={1.8} />
    </svg>
  );
}
