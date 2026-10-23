'use client';

import Link from 'next/link';
import { useState } from 'react';
import { validateSignUp, type SignUpErrors } from '@coin-collecting/shared';
import { CoButton, Field } from '@/components/co';
import { AuthNotice, AuthShell, authLink } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Same rules and words as the mobile sign-up (packages/shared, authRules.ts).
    const found = validateSignUp(email, password, confirm);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setError(null);
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // signup_platform lets sign-ups be counted by where they came from
      // (the mobile app records 'ios' or 'android').
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { signup_platform: 'web' } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthShell
        eyebrow="New account"
        title="Check your inbox."
        subtitle={`We sent a verification email to ${sentTo}. Confirm your address to sign in.`}
        footer={
          <Link href="/auth/signin" className={authLink}>
            ← Back to sign in
          </Link>
        }
      >
        <AuthNotice tone="success">Didn&apos;t see it? Check your spam folder. The link opens Coin Odyssey here.</AuthNotice>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New account"
      title="Start a collection."
      subtitle="One account keeps your collection synced and backed up."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/signin" className={authLink}>
            Sign in
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
          invalid={!!errors.email}
          helper={errors.email}
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          invalid={!!errors.password}
          helper={errors.password ?? 'At least 6 characters'}
          placeholder="••••••••"
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          invalid={!!errors.confirm}
          helper={errors.confirm}
          placeholder="••••••••"
        />
        <CoButton type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </CoButton>
        <p className="text-center text-[12px] text-co-fg3">
          By creating an account you agree to the{' '}
          <a href="/terms" className={authLink}>
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className={authLink}>
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </AuthShell>
  );
}
