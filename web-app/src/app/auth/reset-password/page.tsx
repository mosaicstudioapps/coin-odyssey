'use client';

// Where a reset email lands, after /auth/callback has turned its code into a
// session. When it couldn't, the callback adds ?problem= to say why, and this
// page tells the person what happened and what to do next.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateNewPassword, type NewPasswordErrors } from '@coin-collecting/shared';
import { CoButton, Field } from '@/components/co';
import { AuthNotice, AuthShell, authLink } from '@/components/auth/AuthShell';
import { supabase } from '@/lib/supabase';

const PROBLEMS = {
  other_device: {
    title: 'Open this link where you asked for it.',
    subtitle:
      'For your security, a reset link only works in the browser that asked for it. Open the email on that device, or send a new link from this one.',
    action: 'Send a new link from here',
  },
  expired: {
    title: 'This link has expired.',
    subtitle:
      'Each reset link works once and for about an hour, and asking again replaces the older ones. Send a new link and use the newest email.',
    action: 'Send a new link',
  },
} as const;

type Problem = keyof typeof PROBLEMS;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Read here rather than with useSearchParams, which would need a Suspense boundary.
    const reported = new URLSearchParams(window.location.search).get('problem');
    if (reported === 'other_device' || reported === 'expired') setProblem(reported);
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

  // A failed link shows its reason even if this browser is signed in from
  // before, so nobody mistakes an old session for a verified reset.
  if (problem || !hasSession) {
    const shown = PROBLEMS[problem ?? 'expired'];
    return (
      <AuthShell
        eyebrow="Password help"
        title={shown.title}
        subtitle={shown.subtitle}
        footer={
          <Link href="/auth/signin" className={authLink}>
            ← Back to sign in
          </Link>
        }
      >
        <CoButton onClick={() => router.push('/auth/forgot-password')} className="w-full">
          {shown.action}
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
