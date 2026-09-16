import { describe, expect, it } from 'vitest';
import { siteMetadata } from './site-metadata';

describe('siteMetadata', () => {
  it.each(['/', '/app/'] as const)('keeps the canonical and share URL scoped to %s', (path) => {
    const metadata = siteMetadata(path);
    expect(metadata.metadataBase?.href).toBe('https://drafta-memo.com/');
    expect(metadata.applicationName).toBe('Drafta');
    expect(metadata.title).toBe('Drafta - Every thought in one place.');
    expect(metadata.description).toBe('The new memo app that unifies ToDo and Notes.');
    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.openGraph).toMatchObject({
      url: path,
      type: 'website',
      siteName: 'Drafta',
      title: metadata.title,
      description: metadata.description,
      images: [{ url: '/brand/og.png', width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: metadata.title,
      description: metadata.description,
    });
    expect(metadata.icons).toMatchObject({
      icon: [{ url: '/brand/feather.png', sizes: '128x128', type: 'image/png' }],
      apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
    });
  });
});
