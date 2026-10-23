import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusPage, statusPrimary, statusSecondary } from '@/components/StatusPage';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <StatusPage
      stamp="404"
      eyebrow="Not found"
      title="This page isn't in the collection."
      body="The link may be old, or the page may have moved. Try the checklists, or your own collection."
      actions={
        <>
          <Link href="/" className={statusPrimary}>
            Go home
          </Link>
          <Link href="/checklists" className={statusSecondary}>
            Coin checklists
          </Link>
          <Link href="/collection" className={statusSecondary}>
            Your collection
          </Link>
        </>
      }
    />
  );
}
