import type { Viewport } from 'next';
import { siteMetadata } from '@/lib/site-metadata';

export const metadata = siteMetadata('/app/');
// The app keeps clear of the notch and home indicator itself (specs/19_mobile_design.md).
export const viewport: Viewport = { viewportFit: 'cover' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
