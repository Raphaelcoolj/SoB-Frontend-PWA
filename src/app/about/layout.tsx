import type { Metadata } from 'next';
import { SITE_DESCRIPTION, ABOUT_PAGE } from '../../lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    url: ABOUT_PAGE,
    siteName: 'SoB',
    title: 'SoB — About',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — About',
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: ABOUT_PAGE,
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
