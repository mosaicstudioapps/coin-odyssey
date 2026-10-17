'use client';

// Where a reset email lands, after /auth/callback has turned its code into a
// session. Without that session the link was expired or already used.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateNewPassword, type NewPasswordErrors } from '@coin-collecting/shared';
import { CoButton, Field } from '@/components/co';
import { AuthNotice, AuthShell, authLink } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // Same rules and words as the mobile reset (packages/shared, authRules.ts).
    const found = validateNewPassword(password, confirm);
    setErrors(found);
    if (found.password || found.confirm) return;
    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    router.push('/dashboard');
  };

  if (hasSession === null) {
    return <div className="min-h-screen bg-co-bg" />;
  }

  if (!hasSession) {
    return (
      <AuthShell
        eyebrow="Password help"
        title="This link has expired."
        subtitle="Reset links work once and for about an hour. Ask for a new one."
        footer={
          <Link href="/auth/signin" className={authLink}>
            ← Back to sign in
          </Link>
        }
      >
        <CoButton onClick={() => router.push('/auth/forgot-password')} className="w-full">
          Send a new link
        </CoButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password help"
      title="Choose a new password."
      subtitle="Your reset link was verified. Set a new password for your account."
      footer={
        <Link href="/dashboard" className={authLink}>
          Skip for now
        </Link>
      }
    >
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          invalid={!!errors.password}
          helper={errors.password}
          placeholder="At least 8 characters"
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          invalid={!!errors.confirm}
          helper={errors.confirm}
          placeholder="Repeat new password"
        />
        <CoButton type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? 'Saving…' : 'Save new password'}
        </CoButton>
      </form>
    </AuthShell>
  );
}
