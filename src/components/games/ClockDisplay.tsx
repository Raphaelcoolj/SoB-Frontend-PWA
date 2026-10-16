'use client';

// Live countdown clock for a game. Ticks locally from the last server snapshot
// (whiteMs/blackMs + turnStartedAt); the server is the source of truth on moves.

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { GameClocks, GameColor } from '../../types/game';

interface ClockDisplayProps {
  clocks: GameClocks;
  turn: GameColor;
  /** Whose clock to display (the player whose row this is). */
  color: GameColor;
  running?: boolean;
  className?: string;
}

const formatMs = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 10) return `${m}:${s.toString().padStart(2, '0')}`;
  // Sub-10 minutes show tenths once under a minute.
  if (ms < 60000) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function ClockDisplay({ clocks, turn, color, running = true, className }: ClockDisplayProps) {
  const base = color === 'white' ? clocks.whiteMs : clocks.blackMs;
  const [now, setNow] = useState(() => Date.now());

  const isTicking = turn === color && running && base != null && !!clocks.turnStartedAt;

  useEffect(() => {
    if (!isTicking) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [isTicking]);

  const display = (() => {
    if (base == null) return null;
    if (!isTicking || !clocks.turnStartedAt) return base;
    const elapsed = now - new Date(clocks.turnStartedAt).getTime();
    return Math.max(0, base - elapsed);
  })();

  const low = display != null && display < 20000;
  const urgent = display != null && display < 10000;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono tabular-nums text-sm font-semibold',
        turn === color && running
          ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
          : 'bg-muted text-muted-foreground',
        urgent && turn === color && 'bg-destructive/15 text-destructive ring-1 ring-destructive/40 animate-pulse',
        low && turn === color && !urgent && 'text-amber-500',
        className
      )}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {display == null ? '∞' : formatMs(display)}
    </div>
  );
}
