"use client";

import dynamic from 'next/dynamic';

// Rendered in the browser only, like /app/ (AGENTS.md, Playground).
const Playground = dynamic(() => import('@/components/playground'), { ssr: false });
export default function Page() {
  return <Playground />;
}
