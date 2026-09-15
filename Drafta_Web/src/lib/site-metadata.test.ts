import { describe, expect, it } from 'vitest';
import { siteMetadata } from './site-metadata';

describe('siteMetadata', () => {
  it.each(['/', '/app/'] as const)('keeps the canonical and share URL scoped to %s', (path) => {
    const metadata = siteMetadata(path);
    expect(metadata.metadataBase?.href).toBe('https://drafta-memo.com/');
    expect(metadata.description).toBe('Every thought in one place.');
    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.openGraph).toMatchObject({
      url: path,
      type: 'website',
      images: [{ url: '/brand/og.png', width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(metadata.icons).toMatchObject({
      apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
    });
  });
});
