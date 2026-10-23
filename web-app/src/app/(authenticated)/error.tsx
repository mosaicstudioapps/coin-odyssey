'use client';

// A crash inside the signed-in app: the sidebar and tabs stay, so the
// collector can try again or go somewhere else. Their coins are safe; this is
// only the page that failed to draw.
import Link from 'next/link';
import { useEffect } from 'react';
import { StatusPage, statusPrimary, statusSecondary } from '@/components/StatusPage';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App page error', error.digest ?? error.message);
  }, [error]);

  return (
    <StatusPage
      fullScreen={false}
      stamp="ERR"
      eyebrow="Something went wrong"
      title="This page didn't load."
      body="Your collection is safe. Try again, or head back to your dashboard."
      actions={
        <>
          <button type="button" onClick={reset} className={statusPrimary}>
            Try again
          </button>
          <Link href="/dashboard" className={statusSecondary}>
            Dashboard
          </Link>
        </>
      }
    />
  );
}
