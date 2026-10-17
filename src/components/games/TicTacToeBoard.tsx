'use client';

// Interactive tic-tac-toe board. Purely presentational — every move is
// validated by the server; `legalMoves` come from the authoritative game
// payload (cell indices 0-8 as `to` strings). White plays X (always first),
// black plays O.

import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { LegalMove } from '../../types/game';

interface TicTacToeBoardProps {
  /** 9-char board `.........|w` — cells are '.', 'X', or 'O'. */
  position: string;
  legalMoves: LegalMove[];
  orientation: 'white' | 'black';
  lastMove?: { from?: string | null; to: string } | null;
  interactive?: boolean;
  onMove?: (cell: number) => void;
}

const parseBoard = (position: string): string[] => {
  const boardPart = String(position || '').split('|')[0];
  if (boardPart.length !== 9) return Array(9).fill('.');
  return boardPart.split('');
};

export default function TicTacToeBoard({
  position,
  legalMoves,
  lastMove,
  interactive = true,
  onMove,
}: TicTacToeBoardProps) {
  const board = useMemo(() => parseBoard(position), [position]);

  const legalCells = useMemo(() => {
    const set = new Set<number>();
    for (const m of legalMoves) {
      const raw = m.to ?? (m as { cell?: number | string }).cell;
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0 && n <= 8) set.add(n);
    }
    return set;
  }, [legalMoves]);

  const lastTo = lastMove?.to != null ? Number(lastMove.to) : null;

  return (
    <div className="relative w-full aspect-square max-w-[min(100%,360px)] mx-auto select-none">
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full rounded-xl overflow-hidden border border-border/60">
        {board.map((mark, cell) => {
          const isLegal = interactive && mark === '.' && legalCells.has(cell);
          const isLast = lastTo === cell;
          return (
            <button
              key={cell}
              type="button"
              aria-label={`Cell ${cell}${mark === '.' ? ' empty' : ` ${mark}`}`}
              data-testid={`ttt-cell-${cell}`}
              onClick={() => isLegal && onMove?.(cell)}
              className={cn(
                'relative flex items-center justify-center transition-colors border border-border/40',
                'bg-card hover:bg-muted/40',
                isLast && 'bg-[#f7f769]/40',
                isLegal ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              {mark !== '.' && (
                <span
                  className={cn(
                    'text-[min(12vw,3.5rem)] leading-none font-bold',
                    mark === 'X' ? 'text-[var(--accent)]' : 'text-muted-foreground'
                  )}
                >
                  {mark}
                </span>
              )}
              {isLegal && (
                <span className="absolute w-1/3 h-1/3 rounded-full bg-[var(--accent)]/25" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
