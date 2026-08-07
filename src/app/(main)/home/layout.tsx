import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'SoB — Home Feed' },
  description:
    'Your SoB (SphereBrilliq) home feed — the latest articles, stories, posts, and debates from the topics you care about.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: 'website',
    url: 'https://spherebrilliq.online/home',
    siteName: 'SoB',
    title: 'SoB — Home Feed',
    description:
      'Your SoB (SphereBrilliq) home feed — the latest articles, stories, posts, and debates from the topics you care about.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Home Feed',
    description:
      'Your SoB (SphereBrilliq) home feed — the latest articles, stories, posts, and debates from the topics you care about.',
  },
  alternates: {
    canonical: 'https://spherebrilliq.online/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}