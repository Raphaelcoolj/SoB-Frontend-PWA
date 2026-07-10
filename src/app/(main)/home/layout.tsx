import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  openGraph: {
    title: 'SoB — Home',
    description: 'Discover trending content and posts from your feed on SoB.',
    images: [{ url: '/android-chrome-512x512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Home',
    description: 'Discover trending content and posts from your feed on SoB.',
    images: ['/android-chrome-512x512.png'],
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
