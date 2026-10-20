import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

// Installable from the home screen (AGENTS.md, PWA). No service worker, so every launch loads the latest app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app/',
    name: 'Drafta',
    short_name: 'Drafta',
    description: 'The new memo app that unifies ToDo and Notes.',
    start_url: '/app/',
    scope: '/',
    display: 'standalone',
    background_color: '#F9F7F2',
    theme_color: '#FFFFFF',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
