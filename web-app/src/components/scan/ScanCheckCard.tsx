'use client';

// "Check these": the year and mint mark, read back for the collector to
// confirm. They decide the album slot, and the scanner's confidence hasn't
// tracked whether it read them right. A correction saves at once and re-files
// the coin (packages/shared, scanCorrection). Same card as the mobile app.
import { useMemo, useState } from 'react';
import { Check, Info } from 'lucide-react';
import {
  MINT_MARK_CHOICES,
  MINT_MARK_UNKNOWN,
  OTHER_CHOICE,
  canonicalizeMintMark,
  isCustomMintMark,
  parseCheckedYear,
  scanCheckPrompt,
  scanCorrection,
  type Coin,
  type CoinRecognitionResult,
} from '@coin-collecting/shared';
import { Card, ChoiceRow, CoButton, Field } from '@/components/co';
import { updateCoin } from '@/lib/coins';

export function ScanCheckCard({
  recognition,
  coin,
  onCorrected,
  onConfirmed,
}: {
  recognition: CoinRecognitionResult;
  coin: Coin;
  onCorrected: (coin: Coin, recognition: CoinRecognitionResult) => void;
  onConfirmed: () => void;
}) {
  const initialMint = canonicalizeMintMark(recognition.mintMark) ?? MINT_MARK_UNKNOWN;
  const [yearText, setYearText] = useState(recognition.year ? String(recognition.year) : '');
  const [mint, setMint] = useState(initialMint);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The chips, plus whatever odd mark the scanner read (CC, O), so it can be kept.
  const choices = useMemo(() => {
    const base = MINT_MARK_CHOICES.filter(c => c.value !== OTHER_CHOICE);
    return isCustomMintMark(initialMint)
      ? [...base.slice(0, -1), { value: initialMint, label: initialMint }, base[base.length - 1]]
      : [...base];
  }, [initialMint]);

  const year = parseCheckedYear(yearText);
  const changed = year !== recognition.year || mint !== initialMint;

  const save = async () => {
    if (year === null) {
      setError('Enter the year shown on the coin.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fix = scanCorrection(recognition, { year, mintMark: mint });
      const updated = await updateCoin(coin.id, fix);
      onCorrected(updated, { ...recognition, year: fix.year, mintMark: fix.mintMark });
    } catch {
      setError('Could not save. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 border-co-gold-dim p-5">
      <div className="flex flex-col gap-1.5">
        <p className="co-eyebrow flex items-center gap-1.5 text-co-gold-text">
          <Info className="h-3.5 w-3.5" aria-hidden /> Check these
        </p>
        <p className="text-[14px] text-co-fg2">{scanCheckPrompt(recognition)}</p>
      </div>
      <div className="max-w-[10rem]">
        <Field
          label="Year"
          inputMode="numeric"
          value={yearText}
          onChange={e => {
            setYearText(e.target.value);
            setError(null);
          }}
          invalid={!!error}
          placeholder="e.g. 1999"
        />
      </div>
      <ChoiceRow label="Mint mark" options={choices} value={mint} onChange={setMint} />
      {error && (
        <p role="alert" className="text-[13px] text-co-c-low">
          {error}
        </p>
      )}
      <div>
        {changed ? (
          <CoButton onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save correction'}
          </CoButton>
        ) : (
          <CoButton variant="ghost" onClick={onConfirmed} leading={<Check className="h-4 w-4" aria-hidden />}>
            They match the coin
          </CoButton>
        )}
      </div>
    </Card>
  );
}
