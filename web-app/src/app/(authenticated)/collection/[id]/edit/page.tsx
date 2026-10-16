'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { coinToFormValues, formValuesToFields, type CoinFormValues } from '@coin-collecting/shared';
import { CoinForm } from '@/components/forms/CoinForm';
import { getCoin, updateCoin } from '@/lib/coins';

export default function EditCoinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<CoinFormValues | null>(null);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCoin(id)
      .then(coin => {
        if (cancelled) return;
        if (!coin) {
          setProblem('This coin is no longer in your collection.');
          return;
        }
        setName(coin.name);
        setInitial(coinToFormValues(coin));
      })
      .catch(() => !cancelled && setProblem('Could not load this coin. Please try again.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (problem) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-co-fg2">{problem}</p>
        <Link href="/collection" className="font-mono text-[11px] uppercase tracking-[0.1em] text-co-gold-text">
          Back to the catalog
        </Link>
      </div>
    );
  }
  if (!initial) return <p className="text-co-fg3">Loading…</p>;

  return (
    <CoinForm
      eyebrow="EDIT COIN"
      title={name || 'Edit entry'}
      initial={initial}
      saveLabel="Save changes"
      savingLabel="Saving…"
      onCancel={() => router.back()}
      onSave={async (values, photos) => {
        // Cleared fields go as null, so clearing one actually clears it.
        await updateCoin(id, formValuesToFields(values, 'update'), photos);
        router.push(`/collection/${id}`);
      }}
    />
  );
}
