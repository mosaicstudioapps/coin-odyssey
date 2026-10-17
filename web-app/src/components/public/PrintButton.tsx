'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full border border-co-line px-4 py-2.5 text-[14px] text-co-fg hover:bg-co-bg2 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden /> Print checklist
    </button>
  );
}
