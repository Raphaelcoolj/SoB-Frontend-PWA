'use client';

// Interactive chess board. Purely presentational — every move is validated by
// the server; `legalMoves` comes from the authoritative game payload.

import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  parseFen,
  coordsToSquare,
  PIECE_GLYPHS,
  type PlacedPiece,
} from '../../lib/chessBoard';
import type { LegalMove } from '../../types/game';

interface ChessBoardProps {
  fen: string;
  legalMoves: LegalMove[];
  orientation: 'white' | 'black';
  lastMove?: { from: string; to: string } | null;
  check?: boolean;
  interactive?: boolean;
  onMove?: (from: string, to: string, promotion?: string) => void;
}

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;
const PROMOTION_GLYPHS: Record<string, string> = { q: '♕', r: '♖', b: '♗', n: '♘' };
const PROMOTION_NAMES: Record<string, string> = {
  q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight',
};

export default function ChessBoard({
  fen,
  legalMoves,
  orientation,
  lastMove,
  check,
  interactive = true,
  onMove,
}: ChessBoardProps) {
  const parsed = useMemo(() => parseFen(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);
  const [promoFromTo, setPromoFromTo] = useState<{ from: string; to: string } | null>(null);

  const pieceAt = useMemo(() => {
    const map = new Map<string, PlacedPiece>();
    for (const p of parsed?.pieces || []) map.set(p.square, p);
    return map;
  }, [parsed]);

  const targets = useMemo(() => {
    if (!selected) return new Map<string, LegalMove[]>();
    const map = new Map<string, LegalMove[]>();
    for (const m of legalMoves) {
      if (m.from !== selected) continue;
      const list = map.get(m.to) || [];
      list.push(m);
      map.set(m.to, list);
    }
    return map;
  }, [selected, legalMoves]);

  // King in check (side to move) — highlight it.
  const checkedKing = useMemo(() => {
    if (!check || !parsed) return null;
    const king = parsed.pieces.find((p) => p.type === 'k' && p.color === parsed.turn);
    return king?.square || null;
  }, [check, parsed]);

  const files = orientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const ranks = orientation === 'white' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const myColor = orientation === 'white' ? 'w' : 'b';
  const canSelect = (square: string) => {
    if (!interactive || !parsed || parsed.turn !== myColor) return false;
    const piece = pieceAt.get(square);
    if (!selected) return !!piece && piece.color === myColor;
    return true; // clicking a target or another own piece
  };

  const handleSquareClick = (square: string) => {
    if (!interactive || !parsed || parsed.turn !== myColor) return;

    if (selected) {
      const options = targets.get(square);
      if (options && options.length > 0) {
        const needsPromo = options.some((m) => m.promotion);
        if (needsPromo) {
          setPromoFromTo({ from: selected, to: square });
          return;
        }
        onMove?.(selected, square);
        setSelected(null);
        return;
      }
      // Reselect another own piece.
      const piece = pieceAt.get(square);
      if (piece?.color === myColor) {
        setSelected(square);
        return;
      }
      setSelected(null);
      return;
    }
    const piece = pieceAt.get(square);
    if (piece?.color === myColor) setSelected(square);
  };

  const handlePromotion = (promotion: string) => {
    if (promoFromTo) onMove?.(promoFromTo.from, promoFromTo.to, promotion);
    setPromoFromTo(null);
    setSelected(null);
  };

  return (
    <div className="relative w-full aspect-square max-w-[min(100%,520px)] mx-auto select-none">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-border/60">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = coordsToSquare(file, rank);
            const dark = (file + rank) % 2 === 1;
            const piece = pieceAt.get(square);
            const isTarget = targets.has(square);
            const isSelected = selected === square;
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck = checkedKing === square;
            return (
              <button
                key={square}
                type="button"
                aria-label={square}
                onClick={() => handleSquareClick(square)}
                disabled={!canSelect(square) && !targets.has(square)}
                className={cn(
                  'relative flex items-center justify-center text-[min(7vw,2rem)] leading-none transition-colors',
                  dark ? 'bg-[#779556]' : 'bg-[#ebecd0]',
                  isSelected && 'ring-4 ring-inset ring-[var(--accent)]/70',
                  isLast && !isSelected && 'bg-[#f7f769]/60',
                  isCheck && 'bg-[radial-gradient(circle,#ff6b6b_0%,#ebecd0_75%)]',
                  canSelect(square) || isTarget ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {piece && (
                  <span
                    className={cn(
                      'drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]',
                      piece.color === 'w' ? 'text-white' : 'text-black'
                    )}
                  >
                    {PIECE_GLYPHS[piece.color][piece.type]}
                  </span>
                )}
                {isTarget && !piece && (
                  <span className="absolute w-1/3 h-1/3 rounded-full bg-black/25" />
                )}
                {isTarget && piece && (
                  <span className="absolute inset-0 border-[5px] rounded-md border-black/25" />
                )}
                {/* Coordinates */}
                {file === files[0] && (
                  <span
                    className={cn(
                      'absolute top-0.5 left-1 text-[9px] font-semibold',
                      dark ? 'text-[#ebecd0]' : 'text-[#779556]'
                    )}
                  >
                    {rank + 1}
                  </span>
                )}
                {rank === ranks[0] && (
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-1 text-[9px] font-semibold',
                      dark ? 'text-[#ebecd0]' : 'text-[#779556]'
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

      {promoFromTo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xl">
            <p className="text-sm font-medium mb-3 text-center">Promote to</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePromotion(p)}
                  className="w-14 h-14 rounded-xl bg-[#ebecd0] text-3xl flex items-center justify-center hover:scale-105 transition-transform"
                  title={PROMOTION_NAMES[p]}
                >
                  {PROMOTION_GLYPHS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
