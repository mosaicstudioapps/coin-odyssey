import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/checklists';

/** Crawl the public site; keep crawlers out of the signed-in app and sign-in forms. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/scan', '/collection', '/albums', '/achievements', '/map', '/settings', '/auth/', '/design'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
