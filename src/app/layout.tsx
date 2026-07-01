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
import { SerwistProvider } from '@serwist/turbopack/react';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SoB — A Social Platform',
    template: '%s | SoB',
  },
  description: 'SoB — An educational and social content platform.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
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
    url: 'https://sob-frontend.netlify.app',
    siteName: 'SoB',
    title: 'SoB',
    description: 'Educational and social content platform for sharing and discovering knowledge.',
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
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-background text-foreground font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SerwistProvider swUrl="/serwist/sw.js">
            <ThemeInitializer />
            {children}
            <Toaster />
          </SerwistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
