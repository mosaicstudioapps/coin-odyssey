'use client';

// Shown when a page outside the signed-in app crashes. The signed-in app has
// its own (inside the sidebar), and a crash in the root layout itself falls
// through to global-error.tsx.
import Link from 'next/link';
import { useEffect } from 'react';
import { StatusPage, statusPrimary, statusSecondary } from '@/components/StatusPage';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error', error.digest ?? error.message);
  }, [error]);

  return (
    <StatusPage
      stamp="ERR"
      eyebrow="Something went wrong"
      title="This page didn't load."
      body="It's not you. Try again, and if it keeps happening, come back in a few minutes."
      actions={
        <>
          <button type="button" onClick={reset} className={statusPrimary}>
            Try again
          </button>
          <Link href="/" className={statusSecondary}>
            Go home
          </Link>
        </>
      }
    />
  );
}
