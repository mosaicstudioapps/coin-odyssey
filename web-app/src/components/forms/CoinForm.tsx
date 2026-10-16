'use client';

// The add/edit coin form, laid out for a desktop. Same sections, fields,
// pickers, and validation as the mobile form (values and rules are shared).
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  emptyCoinForm,
  validateCoinForm,
  type CoinFormErrors,
  type CoinFormValues,
} from '@coin-collecting/shared';
import { CoButton, Eyebrow, Field } from '@/components/co';
import { CategoryPicker, DenominationPicker, MintMarkPicker } from '@/components/forms/pickers';
import { PHOTO_ACCEPT_ATTRIBUTE, PhotoError, preparePhoto } from '@/lib/photos';

export interface NewPhotos {
  obverse?: Blob;
  reverse?: Blob;
}

type Side = 'obverse' | 'reverse';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2 className="co-eyebrow">{title}</h2>
      {children}
    </section>
  );
}

function PhotoSlot({
  side,
  preview,
  error,
  onPick,
}: {
  side: Side;
  preview: string | null;
  error: string | null;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const name = side === 'obverse' ? 'Obverse' : 'Reverse';
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-co-bg2 ${
          preview ? 'border-co-line' : 'border-dashed border-co-line'
        } hover:border-co-fg4`}
        aria-label={preview ? `Replace the ${name.toLowerCase()} photo` : `Add an ${name.toLowerCase()} photo`}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-[#e7b551]">
              {side === 'obverse' ? 'OBV' : 'REV'}
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <Plus className="h-5 w-5 text-co-fg4" aria-hidden />
            <span className="font-mono text-[10px] tracking-[0.12em] text-co-fg4">{name.toUpperCase()}</span>
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
      {error && <p className="font-mono text-[10px] text-co-c-low">{error}</p>}
    </div>
  );
}

export function CoinForm({
  eyebrow,
  title,
  initial,
  saveLabel,
  savingLabel = 'Saving…',
  onSave,
  onCancel,
}: {
  eyebrow: string;
  title: string;
  initial?: CoinFormValues;
  saveLabel: string;
  savingLabel?: string;
  onSave: (values: CoinFormValues, photos: NewPhotos) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CoinFormValues>(initial ?? emptyCoinForm);
  const [errors, setErrors] = useState<CoinFormErrors>({});
  const [photos, setPhotos] = useState<NewPhotos>({});
  const [previews, setPreviews] = useState<Record<Side, string | null>>({
    obverse: initial?.obverseUri ?? null,
    reverse: initial?.reverseUri ?? null,
  });
  const [photoErrors, setPhotoErrors] = useState<Record<Side, string | null>>({ obverse: null, reverse: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Free preview URLs made for new photos.
  const madeUrls = useRef<string[]>([]);
  useEffect(() => () => madeUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const update = <K extends keyof CoinFormValues>(key: K, value: CoinFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    if (key in errors) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const pick = async (side: Side, file: File) => {
    setPhotoErrors(e => ({ ...e, [side]: null }));
    try {
      const prepared = await preparePhoto(file);
      const url = URL.createObjectURL(prepared);
      madeUrls.current.push(url);
      setPhotos(p => ({ ...p, [side]: prepared }));
      setPreviews(p => ({ ...p, [side]: url }));
    } catch (err) {
      setPhotoErrors(e => ({ ...e, [side]: err instanceof PhotoError ? err.message : 'That photo could not be used.' }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateCoinForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(values, photos);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Please try again.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">{title}</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div className="grid grid-cols-2 gap-3 self-start">
          <PhotoSlot side="obverse" preview={previews.obverse} error={photoErrors.obverse} onPick={file => void pick('obverse', file)} />
          <PhotoSlot side="reverse" preview={previews.reverse} error={photoErrors.reverse} onPick={file => void pick('reverse', file)} />
          <p className="col-span-2 text-[12px] text-co-fg3">JPEG, PNG, or WebP. Photos are resized before upload.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <Section title="BASICS">
            <Field
              label="Name"
              value={values.name}
              onChange={e => update('name', e.target.value)}
              invalid={!!errors.name}
              helper={errors.name}
              placeholder="e.g. 1965 Washington Quarter"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Year"
                inputMode="numeric"
                value={values.year}
                onChange={e => update('year', e.target.value)}
                invalid={!!errors.year}
                helper={errors.year}
                placeholder="1965"
              />
              <Field label="Country" value={values.country} onChange={e => update('country', e.target.value)} placeholder="United States" />
            </div>
            <DenominationPicker
              value={values.denomination}
              onChange={v => update('denomination', v)}
              invalid={!!errors.denomination}
              helper={errors.denomination}
            />
            <CategoryPicker value={values.category} onChange={v => update('category', v)} />
          </Section>

          <Section title="DETAILS">
            <MintMarkPicker value={values.mintMark} onChange={v => update('mintMark', v)} invalid={!!errors.mintMark} helper={errors.mintMark} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Grade" value={values.grade} onChange={e => update('grade', e.target.value)} placeholder="MS-65" />
              <Field label="Designer" value={values.designer} onChange={e => update('designer', e.target.value)} placeholder="George T. Morgan" />
            </div>
            <Field label="Series" value={values.series} onChange={e => update('series', e.target.value)} placeholder="Morgan Dollar, Walking Liberty, …" />
          </Section>

          <Section title="ACQUISITION">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Face value" inputMode="decimal" value={values.faceValue} onChange={e => update('faceValue', e.target.value)} placeholder="0.25" />
              <Field label="Purchase price" inputMode="decimal" value={values.purchasePrice} onChange={e => update('purchasePrice', e.target.value)} placeholder="45.00" />
              <Field label="Purchase date" type="date" value={values.purchaseDate} onChange={e => update('purchaseDate', e.target.value)} />
            </div>
          </Section>

          <Section title="NOTES">
            <Field
              label="Observations"
              multiline
              value={values.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Anything noteworthy about this coin…"
            />
          </Section>

          {saveError && (
            <p role="alert" className="rounded-sm border border-co-warn-border bg-co-warn-bg px-3 py-2 text-[13px] text-co-fg">
              Could not save. {saveError}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-co-line pt-5">
            <CoButton variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </CoButton>
            <CoButton type="submit" disabled={saving}>
              {saving ? savingLabel : saveLabel}
            </CoButton>
          </div>
        </div>
      </div>
    </form>
  );
}
