'use client';

import { useEffect } from 'react';
import { useThemeStore, ACCENT_MAP } from '../../store/themeStore';

/**
 * @file ThemeInitializer.tsx
 * @description Applies the user's chosen accent color as the `--accent` CSS
 * variable on mount. The dynamic <meta name="theme-color"> (status bar color)
 * is owned by ThemeColorSync — do not duplicate it here.
 */

export function ThemeInitializer() {
  const { accentColor } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', ACCENT_MAP[accentColor]);
  }, [accentColor]);

  return null;
}
