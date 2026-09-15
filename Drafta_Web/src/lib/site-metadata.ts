import type { Metadata } from 'next';

export function siteMetadata(path: '/' | '/app/'): Metadata {
  const siteName = 'Drafta';
  const title = 'Drafta - Every thought in one place.';
  const description = 'The new memo app that unifies ToDo and Notes.';
  const image = {
    url: '/brand/og.png',
    width: 1200,
    height: 630,
    alt: 'Drafta — Every thought in one place.',
  };

  return {
    metadataBase: new URL('https://drafta-memo.com'),
    applicationName: siteName,
    title,
    description,
    alternates: { canonical: path },
    icons: {
      apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
      icon: [{ url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' }],
    },
    openGraph: {
      type: 'website',
      siteName,
      title,
      description,
      url: path,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
