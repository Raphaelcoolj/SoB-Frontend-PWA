import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'SoB — Connect, Discover & Share' },
  description:
    'The SoB home feed at spherebrilliq.online — the latest articles, stories, posts, and debates from the topics you care about.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://spherebrilliq.online/home',
    siteName: 'SoB',
    title: 'SoB — Connect, Discover & Share',
    description:
      'The SoB home feed at spherebrilliq.online — the latest articles, stories, posts, and debates from the topics you care about.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Connect, Discover & Share',
    description:
      'The SoB home feed at spherebrilliq.online — the latest articles, stories, posts, and debates from the topics you care about.',
  },
  alternates: {
    canonical: 'https://spherebrilliq.online/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}