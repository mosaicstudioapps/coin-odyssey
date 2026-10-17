// One printable checklist, pre-rendered at build time from the shared album
// data, with ItemList structured data for search engines.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { CoinDisc } from '@/components/co';
import { PrintButton } from '@/components/public/PrintButton';
import { StoreBadges } from '@/components/public/StoreBadges';
import { SITE_URL, checklistRows, getChecklist, listChecklists } from '@/lib/checklists';

export const dynamicParams = false;

export function generateStaticParams() {
  return listChecklists().map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const checklist = getChecklist((await params).slug);
  if (!checklist) return {};
  const url = `/checklists/${checklist.slug}`;
  return {
    title: `${checklist.heading} (${checklist.album.subtitle})`,
    description: checklist.description,
    alternates: { canonical: url },
    openGraph: { title: checklist.heading, description: checklist.description, url },
  };
}

export default async function ChecklistPage({ params }: { params: Promise<{ slug: string }> }) {
  const checklist = getChecklist((await params).slug);
  if (!checklist) notFound();
  const { album } = checklist;
  const hasMint = album.sections.some(s => s.slots.some(slot => slot.match.kind === 'yearMint'));
  const allRows = checklistRows(checklist);

  // Structured data: the checklist as an ordered list of coins. `<` is escaped
  // so no value can close the script tag.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: checklist.heading,
    description: checklist.description,
    url: `${SITE_URL}/checklists/${checklist.slug}`,
    numberOfItems: allRows.length,
    itemListElement: allRows.map((row, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: [row.year && !row.name.includes(String(row.year)) ? row.year : null, row.name, row.detail ? `(${row.detail})` : null]
        .filter(Boolean)
        .join(' '),
    })),
  }).replace(/</g, '\\u003c');

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 md:px-8 print:max-w-none print:gap-4 print:px-0 print:py-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Link href="/checklists" className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-co-fg2 hover:text-co-fg print:hidden">
        <ChevronLeft className="h-4 w-4" aria-hidden /> All checklists
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="print:hidden">
            <CoinDisc size={56} tone={album.discTone} label={album.title.slice(0, 2)} />
          </span>
          <div>
            <p className="co-eyebrow">
              {album.subtitle} · {album.totalSlots} coins
            </p>
            <h1 className="font-display text-[36px] leading-tight tracking-[-0.02em] text-co-fg print:text-[24px]">{checklist.heading}</h1>
          </div>
        </div>
        <div className="flex max-w-prose flex-col gap-3 text-[16px] leading-relaxed text-co-fg2 print:hidden">
          {checklist.intro.map(p => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <PrintButton />
          <Link href="/auth/signup" className="rounded-full bg-co-gold px-5 py-2.5 text-[14px] font-medium text-co-gold-fg hover:brightness-105">
            Track this in Coin Odyssey
          </Link>
        </div>
      </header>

      {album.sections.map(section => {
        const rows = checklistRows(checklist, section.slots);
        return (
          <section key={section.id} className="flex flex-col gap-2 print:break-inside-avoid-page" aria-labelledby={section.id}>
            <h2 id={section.id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-co-fg2">
              {section.title} <span className="text-co-fg4">· {section.slots.length}</span>
            </h2>
            <table className="w-full table-fixed border-collapse text-left text-[14px]">
              <colgroup>
                <col className="w-8" />
                <col />
                <col className="w-36" />
                <col className="w-40" />
              </colgroup>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Have it</th>
                  <th scope="col">Coin</th>
                  <th scope="col">{hasMint ? 'Mint' : 'Year'}</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-co-line2 print:border-gray-300">
                    <td className="w-8 py-2 align-top">
                      <span className="mt-0.5 block h-4 w-4 rounded-[3px] border border-co-fg4 print:border-gray-500" aria-hidden />
                    </td>
                    <td className="py-2 pr-4 align-top text-co-fg">{row.name}</td>
                    <td className="py-2 pr-4 align-top font-mono text-[12px] text-co-fg3">{hasMint ? row.mint : row.year}</td>
                    <td className="py-2 align-top text-[13px] text-co-fg3">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <aside className="flex flex-col gap-4 rounded-md border border-co-line bg-co-bg2 p-6 print:hidden">
        <p className="font-display text-[22px] text-co-fg">Fill this album by scanning</p>
        <p className="max-w-prose text-[15px] text-co-fg2">
          Photograph a coin with Coin Odyssey and it&apos;s identified and dropped into its slot here, with its history. Free on
          iPhone and Android, and on the web.
        </p>
        <StoreBadges />
      </aside>

      <p className="hidden text-[10px] text-gray-500 print:block">
        {checklist.heading} · coinodyssey checklist · {SITE_URL.replace(/^https?:\/\//, '')}/checklists/{checklist.slug}
      </p>
    </article>
  );
}
