'use client';

import { useState } from 'react';
import { Card, ChoiceRow, CoButton, Field } from '@/components/co';

const DENOMINATIONS = [
  { value: 'cent', label: 'Cent' },
  { value: 'nickel', label: 'Nickel' },
  { value: 'dime', label: 'Dime' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'half', label: 'Half dollar' },
];

/** Interactive half of the design sheet. */
export function FormSamples() {
  const [denomination, setDenomination] = useState('quarter');
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Coin name" placeholder="1964 Kennedy Half Dollar" />
        <Field label="Year" defaultValue="18999" invalid helper="Enter a year between 1 and this year." />
      </div>
      <Field label="Notes" multiline placeholder="Where you found it, who gave it to you…" />
      <ChoiceRow label="Denomination" options={DENOMINATIONS} value={denomination} onChange={setDenomination} />
      <div className="flex flex-wrap gap-3">
        <CoButton>Save coin</CoButton>
        <CoButton variant="ghost">Cancel</CoButton>
        <CoButton variant="quiet">Retake</CoButton>
        <CoButton disabled>Saving…</CoButton>
      </div>
    </Card>
  );
}
