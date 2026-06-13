'use client';

/**
 * @file page.tsx (settings/appearance)
 * @description Appearance settings: dark/light mode toggle + accent color swatch picker.
 * Changes apply instantly and are persisted to localStorage via next-themes and themeStore.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useThemeStore, AccentColor, ACCENT_MAP } from '../../../../store/themeStore';

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'black', label: 'Neutral' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor } = useThemeStore();

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Appearance</h1>
      </div>

      {/* Theme mode */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-medium text-foreground">Color Mode</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                theme === value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Accent color */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-medium text-foreground">Accent Color</h2>
        <p className="text-xs text-muted-foreground">Applies to buttons, links, and highlights throughout the app.</p>
        <div className="flex gap-4">
          {ACCENT_OPTIONS.map(({ value, label }) => {
            const hex = ACCENT_MAP[value];
            const isSelected = accentColor === value;
            return (
              <button
                key={value}
                onClick={() => setAccentColor(value)}
                className={`flex flex-col items-center gap-2 cursor-pointer group`}
              >
                <div
                  className={`w-12 h-12 rounded-full border-4 transition-all duration-200 shadow-md group-hover:scale-110 active:scale-95 ${
                    isSelected ? 'border-foreground scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
                <span className={`text-xs font-semibold transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Preview</p>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: ACCENT_MAP[accentColor] }}>
              Primary Button
            </button>
            <span className="px-3 py-2 text-sm font-semibold" style={{ color: ACCENT_MAP[accentColor] }}>
              Link Text
            </span>
            <div className="w-2 h-2 rounded-full mt-3" style={{ backgroundColor: ACCENT_MAP[accentColor] }} />
          </div>
        </div>
      </section>
    </div>
  );
}

