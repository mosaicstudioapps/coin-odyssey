'use client';

// Settings: the same sections as the mobile screen. There's no sync status
// (the web app has no offline queue) and no "Default grade scale" (a mobile
// stub that does nothing).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { CURRENCY_OPTIONS, isCurrencyCode } from '@coin-collecting/shared';
import { Card, CoButton, Eyebrow, Field, ThemeChoice } from '@/components/co';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { useCoins } from '@/lib/useCoins';
import { cn } from '@/lib/utils';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const DELETE_WORD = 'DELETE';

interface Account {
  name: string;
  email: string;
  memberSince: string;
}

function Row({ label, children, className }: { label: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[52px] items-center justify-between gap-4 px-5 py-3', className)}>
      <span className="text-[14px] text-co-fg">{label}</span>
      {children}
    </div>
  );
}

const rowLink = 'flex min-h-[52px] w-full items-center justify-between gap-4 px-5 py-3 text-left text-[14px] hover:bg-co-bg3';

export default function SettingsPage() {
  const router = useRouter();
  const { coins } = useCoins();
  const { currency, setCurrency } = useCurrency();
  const [account, setAccount] = useState<Account | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const firstName = user.user_metadata?.firstName;
      setAccount({
        name: typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Collector',
        email: user.email ?? '—',
        memberSince: user.created_at
          ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
          : '—',
      });
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw error;
      if (data && (data as { success?: boolean }).success === false) {
        throw new Error((data as { error?: string }).error ?? 'Delete failed');
      }
      await supabase.auth.signOut().catch(() => undefined);
      router.push('/auth/signin');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Please try again, or contact support.');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <Eyebrow>You</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Settings</h1>
      </header>

      <Card className="flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-co-gold font-display text-[22px] text-co-gold-fg">
          {(account?.name[0] ?? 'C').toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[20px] text-co-fg">{account?.name ?? ' '}</p>
          <p className="font-mono text-[10px] tracking-[0.1em] text-co-fg3">
            MEMBER SINCE {account?.memberSince ?? '—'} · {coins.length} COIN{coins.length === 1 ? '' : 'S'}
          </p>
        </div>
      </Card>

      <section className="flex flex-col gap-2" aria-labelledby="s-account">
        <h2 id="s-account" className="co-eyebrow">Account</h2>
        <Card className="overflow-hidden">
          <Row label="Email">
            <span className="truncate text-[14px] text-co-fg2">{account?.email ?? '—'}</span>
          </Row>
          <button type="button" onClick={() => router.push('/auth/forgot-password')} className={cn(rowLink, 'border-t border-co-line2 text-co-fg')}>
            Change password
            <ChevronRight className="h-3.5 w-3.5 text-co-fg3" aria-hidden />
          </button>
        </Card>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="s-prefs">
        <h2 id="s-prefs" className="co-eyebrow">Preferences</h2>
        <Card className="overflow-hidden">
          <Row label="Theme">
            <div className="w-56">
              <ThemeChoice compact />
            </div>
          </Row>
          <Row label="Currency" className="border-t border-co-line2">
            <label className="sr-only" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={e => isCurrencyCode(e.target.value) && setCurrency(e.target.value)}
              className="rounded-sm border border-co-line bg-co-bg2 px-3 py-2 text-[14px] text-co-fg focus:border-co-gold-text focus:outline-none"
            >
              {CURRENCY_OPTIONS.map(option => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.symbol} — {option.label}
                </option>
              ))}
            </select>
          </Row>
        </Card>
        <p className="text-[12px] text-co-fg3">Currency only changes the symbol shown on prices you entered. Coin Odyssey doesn&apos;t estimate values.</p>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="s-legal">
        <h2 id="s-legal" className="co-eyebrow">Legal</h2>
        <Card className="overflow-hidden">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={cn(rowLink, 'text-co-fg')}>
            Privacy policy
            <ExternalLink className="h-3.5 w-3.5 text-co-fg3" aria-hidden />
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={cn(rowLink, 'border-t border-co-line2 text-co-fg')}>
            Terms of service
            <ExternalLink className="h-3.5 w-3.5 text-co-fg3" aria-hidden />
          </a>
          <a href="/contact" target="_blank" rel="noopener noreferrer" className={cn(rowLink, 'border-t border-co-line2 text-co-fg')}>
            Contact
            <ExternalLink className="h-3.5 w-3.5 text-co-fg3" aria-hidden />
          </a>
        </Card>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="s-data">
        <h2 id="s-data" className="co-eyebrow">Data</h2>
        <Card className="overflow-hidden">
          <button type="button" onClick={() => setConfirmSignOut(true)} className={cn(rowLink, 'text-co-fg')}>
            Sign out
            <ChevronRight className="h-3.5 w-3.5 text-co-fg3" aria-hidden />
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className={cn(rowLink, 'border-t border-co-line2 text-co-c-low')}>
            Delete account
            <ChevronRight className="h-3.5 w-3.5 text-co-fg3" aria-hidden />
          </button>
        </Card>
      </section>

      <p className="text-center font-mono text-[10px] tracking-[0.12em] text-co-fg4">COIN ODYSSEY WEB · v{APP_VERSION}</p>

      <Dialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <DialogContent className="border-co-line bg-co-bg2">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-normal">Sign out</DialogTitle>
            <DialogDescription className="text-co-fg2">Sign out of your account on this browser?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <CoButton variant="ghost" onClick={() => setConfirmSignOut(false)}>
              Cancel
            </CoButton>
            <CoButton onClick={() => void signOut()}>Sign out</CoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={open => {
          if (deleting) return;
          setConfirmDelete(open);
          if (!open) {
            setDeleteWord('');
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="border-co-line bg-co-bg2">
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] font-normal">Delete account</DialogTitle>
            <DialogDescription className="text-co-fg2">
              This permanently deletes your account, every coin and photo, and your badges, on the web and in the app. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <Field
            label={`Type ${DELETE_WORD} to confirm`}
            value={deleteWord}
            onChange={e => setDeleteWord(e.target.value)}
            autoComplete="off"
            disabled={deleting}
          />
          {deleteError && (
            <p role="alert" className="text-[13px] text-co-c-low">
              Could not delete your account. {deleteError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <CoButton variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </CoButton>
            <CoButton
              onClick={() => void deleteAccount()}
              disabled={deleting || deleteWord.trim().toUpperCase() !== DELETE_WORD}
              className="bg-co-c-low text-co-bg2"
            >
              {deleting ? 'Deleting…' : 'Delete forever'}
            </CoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
