'use client';

/**
 * @file useThemeColor.ts
 * @description Keeps the PWA's <meta name="theme-color"> in sync with the
 * active theme so the native mobile status bar color matches the app's
 * current background (pure black in dark mode, pure white in light mode).
 * Driven by next-themes' `resolvedTheme`, so system-theme follow and manual
 * toggles both update the meta tag without reading fragile CSS variables.
 */

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export const DARK_THEME_COLOR = '#000000';
export const LIGHT_THEME_COLOR = '#ffffff';

export const THEME_COLORS: Record<'dark' | 'light', string> = {
  dark: DARK_THEME_COLOR,
  light: LIGHT_THEME_COLOR,
};

/**
 * Create (if missing) or update the `meta[name="theme-color"]` tag.
 * Extracted so it can be reused and unit-tested without a React render.
 */
export function setMetaThemeColor(color: string): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

export function useThemeColor(): void {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== 'dark' && resolvedTheme !== 'light') return;
    setMetaThemeColor(THEME_COLORS[resolvedTheme]);
  }, [resolvedTheme]);
}
