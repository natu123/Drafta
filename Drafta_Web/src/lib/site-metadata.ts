import type { Metadata } from 'next';

export function siteMetadata(path: '/' | '/app/' | '/playground/' | '/updates/' | '/s/'): Metadata {
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
      icon: [{ url: '/brand/feather.png', sizes: '128x128', type: 'image/png' }],
    },
    // iOS home-screen launch (AGENTS.md, PWA); the default status bar keeps content below it.
    appleWebApp: { capable: true, title: siteName, statusBarStyle: 'default' },
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
