import type { Metadata } from 'next';
import Link from 'next/link';
import { CoinDisc } from '@/components/co';
import { checklistShortCount, listChecklists } from '@/lib/checklists';

export const metadata: Metadata = {
  title: 'Coin checklists',
  description:
    'Free, printable checklists for U.S. coin series: State, America the Beautiful, American Women, and Washington quarters; Lincoln cents; Buffalo and Jefferson nickels; Mercury and Roosevelt dimes; Walking Liberty and Kennedy halves; and Morgan, Peace, Sacagawea, and Presidential dollars.',
  alternates: { canonical: '/checklists' },
};

export default function ChecklistsPage() {
  const checklists = listChecklists();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 md:px-8">
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="co-eyebrow">Free and printable</p>
        <h1 className="font-display text-[40px] leading-tight tracking-[-0.02em] text-co-fg">Coin checklists</h1>
        <p className="text-[16px] leading-relaxed text-co-fg2">
          Every date, mint mark, and design for the U.S. series collectors love most. Print one for your folder, or track it in
          Coin Odyssey, where scanned coins fill their own slots.
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-co-line border-y border-co-line">
        {checklists.map(c => (
          <li key={c.slug}>
            <Link href={`/checklists/${c.slug}`} className="group flex items-center gap-5 py-5">
              <CoinDisc size={52} tone={c.album.discTone} label={c.album.title.slice(0, 2)} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[21px] text-co-fg group-hover:text-co-gold-text">{c.album.title}</span>
                <span className="mt-0.5 block text-[14px] text-co-fg2">{c.description}</span>
              </span>
              <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.1em] text-co-fg3 sm:block">
                {c.album.subtitle} · {checklistShortCount(c)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
