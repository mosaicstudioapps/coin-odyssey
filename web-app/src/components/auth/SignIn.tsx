'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isValidEmail } from '@coin-collecting/shared';
import { CoButton, Field } from '@/components/co';
import { supabase } from '@/lib/supabase';
import { AuthNotice, AuthShell, authLink } from './AuthShell';

const LINK_ERRORS: Record<string, string> = {
  link_expired: 'That link has expired or was already used. Sign in, or ask for a new link.',
};

/** Only same-site paths, so `next` can't send someone to another site. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Old links used ?signup=true on this page.
    if (searchParams.get('signup') === 'true') router.replace('/auth/signup');
    const linkError = searchParams.get('error');
    if (linkError) setError(LINK_ERRORS[linkError] ?? 'Something went wrong with that link. Please sign in.');
  }, [searchParams, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email) || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push(safeNext(searchParams.get('next')));
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link href="/auth/signup" className={authLink}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          rightSlot={
            <Link href="/auth/forgot-password" className="text-[12px] text-co-gold-text hover:underline">
              Forgot password?
            </Link>
          }
        />
        <CoButton type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </CoButton>
      </form>
    </AuthShell>
  );
}
