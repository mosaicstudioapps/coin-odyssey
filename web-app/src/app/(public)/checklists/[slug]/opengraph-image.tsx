import { getChecklist, listChecklists } from '@/lib/checklists';
import { SHARE_IMAGE_SIZE, shareImage } from '@/lib/shareImage';

export const alt = 'A Coin Odyssey coin checklist';
export const size = SHARE_IMAGE_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return listChecklists().map(c => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const checklist = getChecklist((await params).slug);
  return shareImage({
    eyebrow: 'Free printable checklist',
    title: checklist?.album.title ?? 'Coin checklists',
    subtitle: checklist ? `${checklist.album.subtitle} · all ${checklist.album.totalSlots} coins` : 'Every date and design',
    tone: checklist?.album.discTone ?? 'gold',
    discLabel: checklist?.album.subtitle.slice(0, 4) ?? 'OBV',
  });
}
