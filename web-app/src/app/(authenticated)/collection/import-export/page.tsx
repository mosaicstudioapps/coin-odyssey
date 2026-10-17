'use client';

// Export the collection as CSV, or import coins from a CSV file. A web-only
// extra: on a desktop is where spreadsheets live. Imported rows go through the
// add-coin form's rules (packages/shared, coinCsv.ts) and save as added by
// hand. Photos aren't part of either.
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, Download, FileUp } from 'lucide-react';
import {
  CSV_FIELDS,
  CSV_FIELD_LABELS,
  csvDuplicateKey,
  csvRowsToCoins,
  coinsToCsv,
  guessCsvMapping,
  parseCsv,
  type CsvField,
  type CsvMapping,
} from '@coin-collecting/shared';
import { Card, CoButton, Eyebrow, ProgressBar } from '@/components/co';
import { createCoins } from '@/lib/coins';
import { useCoins } from '@/lib/useCoins';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
/** Without these the form rules can't save a row, so they must be mapped. */
const REQUIRED: CsvField[] = ['year', 'denomination'];

interface LoadedFile {
  name: string;
  headers: string[];
  rows: string[][];
}

type ImportState =
  | { step: 'idle' }
  | { step: 'saving'; saved: number; total: number }
  | { step: 'done'; saved: number }
  | { step: 'failed'; message: string };

function downloadCsv(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default function ImportExportPage() {
  const { coins, state } = useCoins();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });

  const exportCsv = () => {
    downloadCsv(coinsToCsv(coins), `coin-odyssey-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const load = async (picked: File) => {
    setFileError(null);
    setImportState({ step: 'idle' });
    if (!/\.(csv|txt)$/i.test(picked.name) && picked.type !== 'text/csv') {
      setFileError('Choose a .csv file. In Excel or Numbers, use File → Export (or Save as) → CSV.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFileError('That file is over 5 MB. Split it into smaller files and import each.');
      return;
    }
    const [headers, ...rows] = parseCsv(await picked.text());
    if (!headers || rows.length === 0) {
      setFileError('That file has no rows under its header line.');
      return;
    }
    if (rows.length > MAX_ROWS) {
      setFileError(`That file has ${rows.length} rows; the limit is ${MAX_ROWS} at a time. Split it and import each part.`);
      return;
    }
    setFile({ name: picked.name, headers: headers.map(h => h.trim()), rows });
    setMapping(guessCsvMapping(headers));
  };

  const results = useMemo(() => (file ? csvRowsToCoins(file.rows, mapping) : []), [file, mapping]);
  const existing = useMemo(() => new Set(coins.map(csvDuplicateKey)), [coins]);

  const plan = useMemo(() => {
    const ready = results.filter(r => r.fields);
    const duplicates = ready.filter(r => existing.has(csvDuplicateKey(r.fields!)));
    const toSave = skipDuplicates ? ready.filter(r => !existing.has(csvDuplicateKey(r.fields!))) : ready;
    return {
      toSave,
      duplicates: duplicates.length,
      failed: results.filter(r => !r.fields),
      noted: ready.filter(r => r.notes.length > 0),
    };
  }, [results, existing, skipDuplicates]);

  const missingRequired = REQUIRED.filter(field => mapping[field] === undefined);

  const runImport = async () => {
    const list = plan.toSave.map(r => r.fields!);
    setImportState({ step: 'saving', saved: 0, total: list.length });
    try {
      const saved = await createCoins(list, n => setImportState({ step: 'saving', saved: n, total: list.length }));
      setImportState({ step: 'done', saved });
      setFile(null);
    } catch (err) {
      setImportState({ step: 'failed', message: err instanceof Error ? err.message : 'The import stopped. Please try again.' });
    }
  };

  const setColumn = (field: CsvField, value: string) => {
    setMapping(current => {
      const next = { ...current };
      if (value === '') delete next[field];
      else {
        const index = Number(value);
        // A column feeds one field; taking it here frees it elsewhere.
        for (const key of Object.keys(next) as CsvField[]) if (next[key] === index) delete next[key];
        next[field] = index;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/collection" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Catalog
      </Link>
      <header className="flex flex-col gap-1.5">
        <Eyebrow>Your data</Eyebrow>
        <h1 className="font-display text-[30px] leading-tight tracking-[-0.02em]">Import and export</h1>
        <p className="max-w-prose text-[15px] text-co-fg2">
          Move your collection in and out as a spreadsheet (CSV). Photos aren&apos;t included either way.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Export</Eyebrow>
          <p className="text-[14px] text-co-fg2">
            Every coin and every field you or a scan filled in, one row per coin. Opens in Excel, Numbers, or Google Sheets, and
            imports back here.
          </p>
          <CoButton
            onClick={exportCsv}
            disabled={state !== 'ready' || coins.length === 0}
            leading={<Download className="h-4 w-4" aria-hidden />}
            className="self-start"
          >
            {state === 'loading' ? 'Loading…' : `Download ${plural(coins.length, 'coin')}`}
          </CoButton>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Import</Eyebrow>
          <p className="text-[14px] text-co-fg2">
            A CSV with a header row. Each row needs at least a year and a denomination; we&apos;ll match the columns and show you
            what will be added before anything is saved.
          </p>
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) void load(dropped);
            }}
            className={cn(
              'flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center',
              dragging ? 'border-co-gold bg-co-chip-active-bg' : 'border-co-line'
            )}
          >
            <CoButton variant="ghost" onClick={() => input.current?.click()} leading={<FileUp className="h-4 w-4" aria-hidden />}>
              Choose a CSV file
            </CoButton>
            <p className="font-mono text-[10px] tracking-[0.1em] text-co-fg4">OR DROP IT HERE</p>
          </div>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-label="CSV file to import"
            onChange={e => {
              const picked = e.target.files?.[0];
              if (picked) void load(picked);
              e.target.value = '';
            }}
          />
          {fileError && (
            <p role="alert" className="text-[13px] text-co-c-low">
              {fileError}
            </p>
          )}
          {importState.step === 'done' && (
            <p role="status" className="rounded-sm border border-co-gold-dim bg-co-chip-active-bg px-3 py-2 text-[14px] text-co-fg">
              Added {plural(importState.saved, 'coin')}.{' '}
              <Link href="/collection" className="text-co-gold-text hover:underline">
                See your collection
              </Link>
            </p>
          )}
        </Card>
      </div>

      {file && (
        <section className="flex flex-col gap-6" aria-labelledby="review-import">
          <div className="flex flex-col gap-1">
            <h2 id="review-import" className="font-display text-[22px] tracking-[-0.01em]">
              Review {file.name}
            </h2>
            <p className="font-mono text-[11px] tracking-[0.06em] text-co-fg3">{plural(file.rows.length, 'row').toUpperCase()}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Card className="flex flex-col gap-1 self-start p-5">
              <Eyebrow className="mb-2">Columns</Eyebrow>
              {CSV_FIELDS.map(field => (
                <label key={field} className="flex items-center justify-between gap-3 py-1">
                  <span className="text-[13.5px] text-co-fg">
                    {CSV_FIELD_LABELS[field]}
                    {REQUIRED.includes(field) && <span className="text-co-c-low"> *</span>}
                  </span>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={e => setColumn(field, e.target.value)}
                    className={cn(
                      'w-48 rounded-sm border bg-co-bg2 px-2 py-1.5 text-[13px] text-co-fg focus:border-co-gold-text focus:outline-none',
                      REQUIRED.includes(field) && mapping[field] === undefined ? 'border-co-c-low' : 'border-co-line'
                    )}
                  >
                    <option value="">— Not in file —</option>
                    {file.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <p className="mt-2 text-[12px] text-co-fg3">
                No name column? Coins are named from their year and denomination. Blank mint marks are saved as &ldquo;Not sure&rdquo;.
              </p>
            </Card>

            <div className="flex min-w-0 flex-col gap-4">
              {missingRequired.length > 0 ? (
                <p role="alert" className="rounded-sm border border-co-c-low bg-co-bg2 px-3 py-2.5 text-[14px] text-co-fg">
                  Choose the column for {missingRequired.map(f => CSV_FIELD_LABELS[f].toLowerCase()).join(' and ')} to continue.
                </p>
              ) : (
                <>
                  <Card className="flex flex-col gap-3 p-5">
                    <p className="font-display text-[20px] text-co-fg">
                      {plan.toSave.length > 0 ? `Ready to add ${plural(plan.toSave.length, 'coin')}` : 'Nothing new to add'}
                    </p>
                    <ul className="flex flex-col gap-1 text-[13.5px] text-co-fg2">
                      {plan.failed.length > 0 && <li>{plural(plan.failed.length, 'row')} can&apos;t be imported (listed below).</li>}
                      {plan.noted.length > 0 && <li>{plural(plan.noted.length, 'row')} had something adjusted (listed below).</li>}
                      {plan.duplicates > 0 && (
                        <li>
                          {plural(plan.duplicates, 'row')} match{plan.duplicates === 1 ? 'es' : ''} a coin already in your collection.
                        </li>
                      )}
                    </ul>
                    {plan.duplicates > 0 && (
                      <label className="flex items-center gap-2 text-[13.5px] text-co-fg">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={e => setSkipDuplicates(e.target.checked)}
                          className="h-4 w-4 accent-[var(--co-gold)]"
                        />
                        Skip coins already in my collection
                      </label>
                    )}
                    {importState.step === 'saving' ? (
                      <div className="flex flex-col gap-2">
                        <ProgressBar value={importState.total ? importState.saved / importState.total : 0} label="Import progress" />
                        <p className="font-mono text-[11px] text-co-fg3">
                          {importState.saved} / {importState.total}
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <CoButton onClick={() => void runImport()} disabled={plan.toSave.length === 0}>
                          Add {plural(plan.toSave.length, 'coin')}
                        </CoButton>
                        <CoButton variant="ghost" onClick={() => setFile(null)}>
                          Cancel
                        </CoButton>
                      </div>
                    )}
                    {importState.step === 'failed' && (
                      <p role="alert" className="text-[13px] text-co-c-low">
                        {importState.message}
                      </p>
                    )}
                  </Card>

                  {(plan.failed.length > 0 || plan.noted.length > 0) && (
                    <Card className="overflow-hidden">
                      <ul className="max-h-96 overflow-y-auto">
                        {[...plan.failed, ...plan.noted]
                          .sort((a, b) => a.line - b.line)
                          .map(row => (
                            <li key={row.line} className="flex gap-3 border-b border-co-line2 px-4 py-2.5 text-[13px] last:border-b-0">
                              <span className="w-16 shrink-0 font-mono text-[11px] text-co-fg3">LINE {row.line}</span>
                              <span className={row.fields ? 'text-co-fg2' : 'text-co-c-low'}>
                                {[...row.errors, ...row.notes].join(' ')}
                                {!row.fields && ' Not imported.'}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
