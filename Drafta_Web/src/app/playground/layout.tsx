import { siteMetadata } from '@/lib/site-metadata';

export const metadata = siteMetadata('/playground/');

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
