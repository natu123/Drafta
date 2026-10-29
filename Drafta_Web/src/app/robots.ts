import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Shared memos (specs/24).
      disallow: '/s/',
    },
    sitemap: 'https://drafta-memo.com/sitemap.xml',
  };
}
