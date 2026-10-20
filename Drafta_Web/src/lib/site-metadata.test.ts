import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteMetadata } from './site-metadata';
import manifest from '@/app/manifest';

describe('siteMetadata', () => {
  it.each(['/', '/app/'] as const)('keeps the canonical and share URL scoped to %s', (path) => {
    const metadata = siteMetadata(path);
    expect(String(metadata.metadataBase)).toBe('https://drafta-memo.com/');
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
    expect(metadata.appleWebApp).toEqual({ capable: true, title: 'Drafta', statusBarStyle: 'default' });
  });
});

describe('web app manifest', () => {
  it('opens the app standalone from the home screen with existing icons', () => {
    const app = manifest();
    expect(app).toMatchObject({ name: 'Drafta', short_name: 'Drafta', start_url: '/app/', scope: '/', display: 'standalone' });
    expect(app.icons?.map(icon => [icon.src, icon.sizes])).toEqual([['/brand/icon-192.png', '192x192'], ['/brand/icon-512.png', '512x512']]);
    for (const icon of app.icons ?? []) expect(existsSync(`public${icon.src}`), icon.src).toBe(true);
  });
});
