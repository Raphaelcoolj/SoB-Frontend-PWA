'use client';

/**
 * @file ThemeToggle.tsx
 * @description Button toggle between Light and Dark themes.
 * Employs next-themes. Safely handles SSR hydration delay.
 */

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting until mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg bg-muted/40 animate-pulse" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-secondary text-foreground hover:bg-muted active:scale-95 transition-all duration-200 cursor-pointer"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 fill-amber-400 animate-fade-in" />
      ) : (
        <Moon className="w-4 h-4 text-accent fill-accent animate-fade-in" />
      )}
    </button>
  );
}

