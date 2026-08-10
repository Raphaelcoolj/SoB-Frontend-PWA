import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ThemeColorSync from './ThemeColorSync';

const mocks = vi.hoisted(() => ({
  resolvedTheme: 'dark' as 'dark' | 'light' | undefined,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme }),
}));

function getMetaThemeColor(): string | null {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;
}

function metaThemeColorCount(): number {
  return document.querySelectorAll('meta[name="theme-color"]').length;
}

describe('ThemeColorSync', () => {
  beforeEach(() => {
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
    mocks.resolvedTheme = 'dark';
  });

  it('creates the meta tag and applies the dark status bar color', () => {
    render(<ThemeColorSync />);
    expect(getMetaThemeColor()).toBe('#000000');
  });

  it('switches to the light status bar color when the theme flips', () => {
    const { rerender } = render(<ThemeColorSync />);
    expect(getMetaThemeColor()).toBe('#000000');

    mocks.resolvedTheme = 'light';
    rerender(<ThemeColorSync />);
    expect(getMetaThemeColor()).toBe('#ffffff');
  });

  it('reuses an existing meta tag instead of duplicating it', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#123456');
    document.head.appendChild(meta);

    render(<ThemeColorSync />);
    expect(getMetaThemeColor()).toBe('#000000');
    expect(metaThemeColorCount()).toBe(1);
  });

  it('does not write anything before the resolved theme is known', () => {
    mocks.resolvedTheme = undefined;
    render(<ThemeColorSync />);
    expect(getMetaThemeColor()).toBeNull();
  });
});
