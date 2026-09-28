import { UpdatesPageContent } from '@/components/release-updates';
import { siteMetadata } from '@/lib/site-metadata';

const title = 'Drafta - Updates';
const description = 'Version history and development updates for Drafta.';
const base = siteMetadata('/updates/');
export const metadata = {
  ...base,
  title,
  description,
  openGraph: { ...base.openGraph, title, description },
  twitter: { ...base.twitter, title, description },
};

export default function UpdatesPage() {
  return <UpdatesPageContent />;
}
