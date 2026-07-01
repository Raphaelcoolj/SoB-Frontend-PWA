'use client';

import { useEffect } from 'react';
import { useThemeStore, ACCENT_MAP } from '../../store/themeStore';

function updateThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  const color = bg.startsWith('#') ? bg : `hsl(${bg})`;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bg.startsWith('#') ? bg : `hsl(${bg})`);
}

export function ThemeInitializer() {
  const { accentColor } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', ACCENT_MAP[accentColor]);
  }, [accentColor]);

  useEffect(() => {
    updateThemeColor();
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
