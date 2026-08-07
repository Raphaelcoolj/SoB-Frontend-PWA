import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete Account',
  description:
    'Delete your SoB account and personal data from the social platform at spherebrilliq.online.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}