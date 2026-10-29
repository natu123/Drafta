import { siteMetadata } from '@/lib/site-metadata';

// Shared memos stay out of search engines (specs/24_share_links.md, 2.6).
export const metadata = { ...siteMetadata('/s/'), robots: { index: false, follow: false } };

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
