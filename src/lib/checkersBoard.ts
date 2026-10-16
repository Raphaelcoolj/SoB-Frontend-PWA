// Checkers position helpers — mirrors the backend format:
// `${board}|${turn}|${noCapturePlies}` where board is 64 chars,
// index = rank*8 + file (file 0='a', rank 0='1'), dark squares only.

export type CheckerPiece = 'w' | 'b' | 'W' | 'B' | '.';

export interface ParsedCheckers {
  board: CheckerPiece[];
  turn: 'w' | 'b';
  noCapturePlies: number;
}

const FILES = 'abcdefgh';

export const idxToSquare = (i: number) => `${FILES[i % 8]}${Math.floor(i / 8) + 1}`;

export const squareToIdx = (square: string): number => {
  if (typeof square !== 'string' || square.length !== 2) return -1;
  const file = FILES.indexOf(square[0].toLowerCase());
  const rank = Number(square[1]) - 1;
  if (file < 0 || !(rank >= 0 && rank <= 7)) return -1;
  return rank * 8 + file;
};

export const parseCheckers = (position: string): ParsedCheckers | null => {
  if (typeof position !== 'string') return null;
  const [boardStr, turn, nc] = position.split('|');
  if (typeof boardStr !== 'string' || boardStr.length !== 64) return null;
  if (turn !== 'w' && turn !== 'b') return null;
  const noCapturePlies = Number(nc);
  if (!Number.isInteger(noCapturePlies) || noCapturePlies < 0) return null;
  const board = boardStr.split('') as CheckerPiece[];
  for (const ch of board) {
    if (!'.wbWB'.includes(ch)) return null;
  }
  return { board, turn, noCapturePlies };
};

export const CHECKER_GLYPHS: Record<'w' | 'b' | 'W' | 'B', string> = {
  w: '●',
  b: '○',
  W: '◆',
  B: '◇',
};

export const isDarkSquare = (file: number, rank: number) => (file + rank) % 2 === 0;
