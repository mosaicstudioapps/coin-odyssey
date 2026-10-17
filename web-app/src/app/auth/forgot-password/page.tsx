'use client';

import Link from 'next/link';
import { useState } from 'react';
import { isValidEmail } from '@coin-collecting/shared';
import { CoButton, Field } from '@/components/co';
import { AuthNotice, AuthShell, authLink } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailError(undefined);
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      eyebrow="Password help"
      title={sent ? 'Check your inbox.' : 'Reset your password.'}
      subtitle={sent ? `We sent reset instructions to ${email.trim()}.` : "Enter your email and we'll send a reset link."}
      footer={
        <Link href="/auth/signin" className={authLink}>
          ← Back to sign in
        </Link>
      }
    >
      {error && <AuthNotice tone="error">{error}</AuthNotice>}
      {sent ? (
        <div className="flex flex-col gap-4">
          <AuthNotice tone="success">The link will expire in about an hour. Didn’t see it? Check your spam folder.</AuthNotice>
          <CoButton variant="ghost" onClick={() => void send()} disabled={loading}>
            {loading ? 'Sending…' : 'Send again'}
          </CoButton>
        </div>
      ) : (
        <form onSubmit={send} noValidate className="flex flex-col gap-5">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            invalid={!!emailError}
            helper={emailError}
            placeholder="you@example.com"
          />
          <CoButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Send reset link'}
          </CoButton>
        </form>
      )}
    </AuthShell>
  );
}
