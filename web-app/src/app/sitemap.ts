import type { MetadataRoute } from 'next';
import { SITE_URL, listChecklists } from '@/lib/checklists';

/** The public pages. The signed-in app is private, so it isn't listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/checklists`, changeFrequency: 'monthly', priority: 0.8 },
    ...listChecklists().map(c => ({
      url: `${SITE_URL}/checklists/${c.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
  ];
}
