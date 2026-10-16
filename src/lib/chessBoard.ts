// Minimal FEN helpers for rendering a chess board. The server is the rule
// authority — these only parse the position string for display and for
// matching legal moves (from/to/promotion) submitted by the player.

export type PieceColor = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface PlacedPiece {
  square: string; // e.g. 'e4'
  color: PieceColor;
  type: PieceSymbol;
}

export interface ParsedFen {
  pieces: PlacedPiece[];
  turn: PieceColor;
  castling: string;
  epSquare: string | null;
}

const FILES = 'abcdefgh';

export const squareToCoords = (square: string): { file: number; rank: number } | null => {
  if (typeof square !== 'string' || square.length !== 2) return null;
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  if (file < 0 || !(rank >= 0 && rank <= 7)) return null;
  return { file, rank };
};

export const coordsToSquare = (file: number, rank: number) => `${FILES[file]}${rank + 1}`;

export const parseFen = (fen: string): ParsedFen | null => {
  if (typeof fen !== 'string') return null;
  const [placement, turn, castling, ep] = fen.trim().split(/\s+/);
  if (!placement || !turn) return null;
  const rows = placement.split('/');
  if (rows.length !== 8) return null;

  const pieces: PlacedPiece[] = [];
  // FEN rows run rank 8 → rank 1; our visual board is the same (index 0 = a8).
  for (let r = 0; r < 8; r += 1) {
    const row = rows[r];
    const rank = 7 - r; // 0 = rank1 … 7 = rank8
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const type = ch.toLowerCase() as PieceSymbol;
      if (!'pnbrqk'.includes(type)) return null;
      const color: PieceColor = ch === ch.toUpperCase() ? 'w' : 'b';
      pieces.push({ square: coordsToSquare(file, rank), color, type });
      file += 1;
    }
    if (file !== 8) return null;
  }
  return {
    pieces,
    turn: turn === 'b' ? 'b' : 'w',
    castling: castling && castling !== '-' ? castling : '',
    epSquare: ep && ep !== '-' ? ep : null,
  };
};

/** Unicode glyphs per piece (white first). */
export const PIECE_GLYPHS: Record<PieceColor, Record<PieceSymbol, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};
