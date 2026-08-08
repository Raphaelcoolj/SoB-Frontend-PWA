import type { Metadata } from 'next';

const aboutDescription =
  'SoB is a social platform operated by SphereBrilliq — discover topics, publish and share posts and articles, and participate in discussions.';

export const metadata: Metadata = {
  title: 'About',
  description: aboutDescription,
  openGraph: {
    type: 'website',
    url: 'https://spherebrilliq.online/about',
    siteName: 'SoB',
    title: 'SoB — About',
    description: aboutDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — About',
    description: aboutDescription,
  },
  alternates: {
    canonical: 'https://spherebrilliq.online/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
