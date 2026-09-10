'use client';

/**
 * @file Polyfills.tsx
 * @description Client component that loads browser polyfills for old devices.
 * Mount once in the root layout, before any other client components.
 */
import '../../lib/polyfills';

export default function Polyfills() {
  return null;
}
