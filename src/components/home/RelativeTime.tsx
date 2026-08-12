'use client';

/**
 * @file RelativeTime.tsx
 * @description Client-only relative time label that is safe for hydration.
 * The server and the first client render both show a stable placeholder, and
 * the real "x days ago" value is computed in useEffect after mount (plus a
 * 60s tick) so the ISR-served HTML never causes a hydration mismatch.
 */

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from '../../lib/utils';

interface RelativeTimeProps {
  date: string;
  className?: string;
}

const TICK_MS = 60000;

export default function RelativeTime({ date, className }: RelativeTimeProps) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
    const timer = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const label = mounted ? formatDistanceToNow(date) : null;

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? '–'}
    </span>
  );
}
