import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://drafta-memo.com/',
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://drafta-memo.com/app/',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
