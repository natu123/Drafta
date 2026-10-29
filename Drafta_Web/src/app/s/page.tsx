"use client";

import dynamic from 'next/dynamic';

// Rendered in the browser only: the memo is named after `#`, which the server never sees.
const SharePage = dynamic(() => import('@/components/share-page'), { ssr: false });
export default function Page() {
  return <SharePage />;
}
