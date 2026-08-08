import type { Metadata } from 'next';
import { FOUNDER_OG_TITLE, FOUNDER_PAGE, SITE_DESCRIPTION } from '../../lib/site';

export const metadata: Metadata = {
  title: FOUNDER_OG_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'profile',
    url: FOUNDER_PAGE,
    siteName: 'SoB',
    title: FOUNDER_OG_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: FOUNDER_OG_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: FOUNDER_PAGE,
  },
};

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
