'use client';

import { useRouter } from 'next/navigation';
import { formValuesToFields } from '@coin-collecting/shared';
import { CoinForm } from '@/components/forms/CoinForm';
import { createCoin } from '@/lib/coins';
import { backfillStoryInBackground } from '@/lib/story';

export default function AddCoinPage() {
  const router = useRouter();
  return (
    <CoinForm
      eyebrow="ADD COIN"
      title="New entry"
      saveLabel="Save coin"
      savingLabel="Saving…"
      onCancel={() => router.back()}
      onSave={async (values, photos) => {
        const coin = await createCoin(formValuesToFields(values, 'create'), photos);
        // A hand-typed coin has no scan behind it, so its story is fetched
        // separately, in the background, like on mobile.
        backfillStoryInBackground(coin);
        router.push(`/collection/${coin.id}`);
      }}
    />
  );
}
