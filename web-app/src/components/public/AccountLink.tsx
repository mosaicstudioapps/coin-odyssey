'use client';

// "Sign in" for visitors, "Open your collection" for collectors already
// signed in on this browser. Public pages are static, so this checks on the
// client after load.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  return signedIn ? (
    <Link href="/dashboard" className="rounded-full bg-co-gold px-4 py-2 text-[13px] font-medium text-co-gold-fg hover:brightness-105">
      Open your collection
    </Link>
  ) : (
    <Link href="/auth/signin" className="rounded-full border border-co-line px-4 py-2 text-[13px] text-co-fg hover:bg-co-bg2">
      Sign in
    </Link>
  );
}
