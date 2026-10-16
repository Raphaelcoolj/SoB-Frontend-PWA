'use client';

// Interactive checkers board. Server-authoritative — `legalMoves` come from
// the game payload and include full multi-jump sequences with `captures`.

import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  parseCheckers,
  idxToSquare,
  squareToIdx,
  CHECKER_GLYPHS,
} from '../../lib/checkersBoard';
import type { LegalMove } from '../../types/game';

interface CheckersBoardProps {
  position: string;
  legalMoves: LegalMove[];
  orientation: 'white' | 'black';
  lastMove?: { from: string; to: string } | null;
  interactive?: boolean;
  onMove?: (from: string, to: string, captures?: string[]) => void;
}

export default function CheckersBoard({
  position,
  legalMoves,
  orientation,
  lastMove,
  interactive = true,
  onMove,
}: CheckersBoardProps) {
  const parsed = useMemo(() => parseCheckers(position), [position]);
  const [selected, setSelected] = useState<string | null>(null);

  const targets = useMemo(() => {
    if (!selected) return new Map<string, LegalMove>();
    const map = new Map<string, LegalMove>();
    for (const m of legalMoves) {
      if (m.from !== selected) continue;
      if (!map.has(m.to)) map.set(m.to, m);
    }
    return map;
  }, [selected, legalMoves]);

  const myColor = orientation === 'white' ? 'w' : 'b';
  const files = orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const ranks = orientation === 'white' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const movableFrom = useMemo(() => {
    const set = new Set<string>();
    if (!parsed || parsed.turn !== myColor) return set;
    for (const m of legalMoves) set.add(m.from);
    return set;
  }, [legalMoves, myColor, parsed]);

  const handleSquareClick = (square: string) => {
    if (!interactive || !parsed || parsed.turn !== myColor) return;
    if (selected) {
      const move = targets.get(square);
      if (move) {
        onMove?.(move.from, move.to, move.captures?.length ? move.captures : undefined);
        setSelected(null);
        return;
      }
      if (movableFrom.has(square)) {
        setSelected(square);
        return;
      }
      setSelected(null);
      return;
    }
    if (movableFrom.has(square)) setSelected(square);
  };

  return (
    <div className="relative w-full aspect-square max-w-[min(100%,520px)] mx-auto select-none">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-border/60">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = idxToSquare(rank * 8 + file);
            const dark = (file + rank) % 2 === 0;
            const pieceIdx = squareToIdx(square);
            const piece = parsed?.board[pieceIdx] ?? '.';
            const isTarget = targets.has(square);
            const isSelected = selected === square;
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
            const canPick = movableFrom.has(square);
            return (
              <button
                key={square}
                type="button"
                aria-label={square}
                onClick={() => handleSquareClick(square)}
                className={cn(
                  'relative flex items-center justify-center transition-colors',
                  dark ? 'bg-[#7d8b6f]' : 'bg-[#eee7d5]',
                  isSelected && 'ring-4 ring-inset ring-[var(--accent)]/70',
                  isLast && !isSelected && 'bg-[#f7f769]/50',
                  canPick || isTarget ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {piece !== '.' && (
                  <span
                    className={cn(
                      'text-[min(8vw,2.4rem)] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
                      piece === 'w' && 'text-white',
                      piece === 'W' && 'text-white',
                      piece === 'b' && 'text-neutral-800',
                      piece === 'B' && 'text-neutral-800'
                    )}
                    style={
                      piece === 'W' || piece === 'B'
                        ? { textShadow: '0 0 0 currentColor, 0 0 4px rgba(255,215,0,0.9)' }
                        : undefined
                    }
                  >
                    {CHECKER_GLYPHS[piece]}
                  </span>
                )}
                {isTarget && (
                  <span
                    className={cn(
                      'absolute rounded-full',
                      parsed?.board[pieceIdx] && parsed.board[pieceIdx] !== '.'
                        ? 'inset-1 border-[4px] border-[var(--accent)]/80 rounded-md'
                        : 'w-1/3 h-1/3 bg-[var(--accent)]/70'
                    )}
                  />
                )}
                {file === files[0] && (
                  <span
                    className={cn(
                      'absolute top-0.5 left-1 text-[9px] font-semibold',
                      dark ? 'text-[#eee7d5]' : 'text-[#7d8b6f]'
                    )}
                  >
                    {rank + 1}
                  </span>
                )}
                {rank === ranks[0] && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-1 text-[9px] font-semibold',
                      dark ? 'text-[#eee7d5]' : 'text-[#7d8b6f]'
                    )}
                  >
                    {'abcdefgh'[file]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
