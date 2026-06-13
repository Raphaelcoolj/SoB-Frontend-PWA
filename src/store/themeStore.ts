import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @file themeStore.ts
 * @description Zustand store for managing UI theme preferences (accent color).
 * Complements next-themes which handles dark/light mode.
 */

export type AccentColor = 'blue' | 'purple' | 'black';

export const ACCENT_MAP: Record<AccentColor, string> = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  black: '#09090B'
};

interface ThemeState {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentColor: 'blue', // Default accent
      setAccentColor: (color) => {
        set({ accentColor: color });
        // Update CSS variable
        const root = document.documentElement;
        root.style.setProperty('--accent', ACCENT_MAP[color]);
      },
    }),
    {
      name: 'sob-theme-storage',
    }
  )
);
