'use client';

/**
 * @file ThemeColorSync.tsx
 * @description Renders nothing; drives the dynamic
 * <meta name="theme-color"> update (native mobile status bar color) from
 * next-themes' resolved theme. Mounted once in the root layout inside the
 * ThemeProvider so `useThemeColor` has access to the theme context.
 */

import { useThemeColor } from '../../hooks/useThemeColor';

export default function ThemeColorSync() {
  useThemeColor();
  return null;
}
