import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact the SoB team — feedback, questions, and support for the platform at spherebrilliq.online.',
  openGraph: {
    type: 'website',
    url: 'https://spherebrilliq.online/contact',
    siteName: 'SoB',
    title: 'SoB — Contact',
    description:
      'Contact the SoB team — feedback, questions, and support for the platform at spherebrilliq.online.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Contact',
    description:
      'Contact the SoB team — feedback, questions, and support for the platform at spherebrilliq.online.',
  },
  alternates: {
    canonical: 'https://spherebrilliq.online/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}