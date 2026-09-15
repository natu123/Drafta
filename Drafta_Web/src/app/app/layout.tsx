import { siteMetadata } from '@/lib/site-metadata';

export const metadata = siteMetadata('/app/');

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
