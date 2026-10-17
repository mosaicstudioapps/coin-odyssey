import { SHARE_IMAGE_SIZE, shareImage } from '@/lib/shareImage';

export const alt = 'Coin Odyssey: photograph a coin, learn its story, and catalog your collection.';
export const size = SHARE_IMAGE_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return shareImage({
    eyebrow: 'For coin collectors',
    title: 'Photograph a coin. Learn its story.',
    subtitle: 'Identify, catalog, and fill your albums. iPhone, Android, and web.',
    tone: 'gold',
    discLabel: '1921',
  });
}
