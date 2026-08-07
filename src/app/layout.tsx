/**
 * @file layout.tsx (root)
 * @description Root application layout for SoB.
 * Wraps the entire app with next-themes ThemeProvider (dark/light mode support),
 * sets up PWA meta tags, Google Fonts, and SEO metadata.
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '../components/ui/sonner';
import { ThemeInitializer } from '../components/shared/ThemeInitializer';
import PwaProvider from '../components/shared/PwaProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://spherebrilliq.online'),
  title: {
    default: 'SoB — Connect, Discover & Share | SphereBrilliq',
    template: '%s | SoB',
  },
  description:
    'SoB (SphereBrilliq) is a social platform for discovering ideas, sharing knowledge, publishing content, and joining meaningful discussions across diverse topics.',
  manifest: '/manifest.json',
  keywords: [
    'sob',
    'SoB',
    'SOB',
    'SphereBrilliq',
    'spherebrilliq.online',
    'social platform',
    'knowledge sharing',
    'community',
    'learning',
  ],
  applicationName: 'SoB',

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SoB',
  },
  formatDetection: {
    telephone: false,
  },
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://spherebrilliq.online',
    siteName: 'SoB',
    title: 'SoB — Connect, Discover & Share | SphereBrilliq',
    description:
      'SoB (SphereBrilliq) is a social platform for discovering ideas, sharing knowledge, publishing content, and joining meaningful discussions across diverse topics.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoB — Connect, Discover & Share | SphereBrilliq',
    description:
      'SoB (SphereBrilliq) is a social platform for discovering ideas, sharing knowledge, publishing content, and joining meaningful discussions across diverse topics.',
  },

   robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: 'https://spherebrilliq.online',
  },
};


/**
 * Viewport config — must be exported separately in Next.js 13.2+.
 * Without this, no <meta name="viewport"> is injected, causing Android Chrome
 * to render at ~980px desktop width then downscale, creating GPU tile artifacts.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* 
          Explicit viewport tag — belt-and-suspenders alongside the Next.js viewport export.
          Without width=device-width,initial-scale=1 on Android Chrome, the browser renders
          at ~980px desktop width and downscales, causing GPU raster tile misalignment
          that appears as colored horizontal scan-line artifacts between scroll items.
        */}
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="bg-background text-foreground font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PwaProvider>
            <ThemeInitializer />
            {children}
            <Toaster />
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
