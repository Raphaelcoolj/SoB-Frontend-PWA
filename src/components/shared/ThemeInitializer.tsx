'use client';

import { useEffect } from 'react';
import { useThemeStore, ACCENT_MAP } from '../../store/themeStore';

/**
 * @file ThemeInitializer.tsx
 * @description Syncs the accent color from Zustand store to CSS variables on mount.
 */

export function ThemeInitializer() {
  const { accentColor } = useThemeStore();

  useEffect(() => {
    // Sync initial/persisted value to CSS variable
    const root = document.documentElement;
    root.style.setProperty('--accent', ACCENT_MAP[accentColor]);
  }, [accentColor]);

  return null;
}
