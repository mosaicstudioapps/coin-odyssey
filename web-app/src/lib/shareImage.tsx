// The share card (Open Graph image) drawn for links posted to Reddit,
// Facebook, forums, and messages. Rendered at build time with next/og, on the
// dark palette, with the light palette's brighter metals for the coin.
import { ImageResponse } from 'next/og';
import { darkPalette, lightPalette } from '@coin-collecting/shared';

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

const TONES = {
  gold: [lightPalette.goldCoinHi, lightPalette.goldCoinMid, lightPalette.goldCoinLo],
  silver: [lightPalette.silverHi, lightPalette.silverMid, lightPalette.silverLo],
  copper: [lightPalette.copperHi, lightPalette.copperMid, lightPalette.copperLo],
} as const;

function Disc({ size, tone, label }: { size: number; tone: keyof typeof TONES; label: string }) {
  const [hi, mid, lo] = TONES[tone];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: `radial-gradient(circle at 30% 25%, ${hi} 0%, ${mid} 45%, ${lo} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(0,0,0,0.45)',
        fontSize: size * 0.14,
        letterSpacing: size * 0.012,
      }}
    >
      {label}
    </div>
  );
}

export function shareImage({
  eyebrow,
  title,
  subtitle,
  tone = 'gold',
  discLabel = 'OBV',
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  tone?: keyof typeof TONES;
  discLabel?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: `linear-gradient(135deg, ${darkPalette.ctaTopWarm} 0%, ${darkPalette.bg} 70%)`,
          color: darkPalette.fg,
          padding: 72,
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6, color: darkPalette.fg2, fontFamily: 'monospace' }}>
            COIN ODYSSEY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
            <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, color: darkPalette.goldText, fontFamily: 'monospace' }}>
              {eyebrow.toUpperCase()}
            </div>
            <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.05 }}>{title}</div>
            <div style={{ display: 'flex', fontSize: 28, color: darkPalette.fg2, fontFamily: 'sans-serif' }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Disc size={300} tone={tone} label={discLabel} />
        </div>
      </div>
    ),
    SHARE_IMAGE_SIZE
  );
}
