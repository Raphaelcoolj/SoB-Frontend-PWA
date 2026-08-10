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
import ThemeColorSync from '../components/shared/ThemeColorSync';
import PwaProvider from '../components/shared/PwaProvider';
import { SITE_DESCRIPTION, HOMEPAGE_OG_TITLE, SITE_URL } from '../lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOMEPAGE_OG_TITLE,
    template: '%s | SoB',
  },
  description: SITE_DESCRIPTION,
  manifest: '/manifest.json',
  keywords: ['SoB', 'SphereBrilliq', 'spherebrilliq.online', 'social platform'],
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
    url: SITE_URL,
    siteName: 'SoB',
    title: HOMEPAGE_OG_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: HOMEPAGE_OG_TITLE,
    description: SITE_DESCRIPTION,
  },

   robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: SITE_URL,
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
  // Static SSR default (dark mode is the app default). ThemeColorSync updates
  // this meta tag client-side to match the active light/dark theme.
  themeColor: '#000000',
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
            <ThemeColorSync />
            {children}
            <Toaster />
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
