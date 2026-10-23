'use client';

// The last resort, for a crash in the root layout itself. It replaces the
// whole document, so it can't rely on the theme CSS or fonts: inline styles,
// taken from the shared dark palette.
import { useEffect } from 'react';
import { darkPalette as p } from '@coin-collecting/shared';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Site error', error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: p.bg,
          color: p.fg,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', color: p.fg3 }}>COIN ODYSSEY</p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 400 }}>Coin Odyssey didn&apos;t load.</h1>
        <p style={{ margin: 0, fontSize: 15, color: p.fg2, maxWidth: 420 }}>
          Try again in a moment. Your collection is safe.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            border: 0,
            borderRadius: 999,
            padding: '12px 22px',
            background: p.gold,
            color: p.goldFg,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
