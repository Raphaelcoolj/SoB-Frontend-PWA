// Shared game types mirroring the backend payload contracts
// (SoB-Backend-API src/services/game.service.js buildGamePayload / invitations).

export type GameType = 'chess' | 'checkers' | 'tic_tac_toe';
export type GameColor = 'white' | 'black';
export type GameStatus = 'active' | 'completed';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type GameResult = 'white' | 'black' | 'draw';

/** Display mark for a color — white plays X, black plays O. */
export const markForColor = (color: GameColor): 'X' | 'O' => (color === 'white' ? 'X' : 'O');

/** Display label for a game type id. */
export const gameTypeLabel = (t: GameType): string =>
  t === 'tic_tac_toe' ? 'tic-tac-toe' : t;

export interface GameUser {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  verificationBadge?: string;
}

export interface GameTimeControl {
  preset: string;
  label: string;
  category: 'bullet' | 'blitz' | 'rapid' | 'untimed';
  initialMs: number | null;
  incrementMs: number;
  rated?: boolean;
}

export interface GamePlayer {
  user: GameUser;
  color: GameColor;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

export interface GameMoveEntry {
  by: string;
  color: GameColor;
  from: string;
  to: string;
  promotion?: string;
  captures: string[];
  notation: string;
  positionAfter: string;
  whiteMs: number | null;
  blackMs: number | null;
  turnStartedAt: string;
  at: string;
}

/** A legal move as returned by the server (authoritative). */
export interface LegalMove {
  from?: string | null;
  to: string;
  cell?: number;
  promotion?: string;
  capture?: boolean;
  captures?: string[];
  piece?: string;
}

export interface GameClocks {
  whiteMs: number | null;
  blackMs: number | null;
  turnStartedAt: string | null;
  timeoutAt: string | null;
}

export interface GameDrawOffer {
  by: string;
  at: string;
}

export interface Game {
  id: string;
  gameId: string;
  gameType: GameType;
  status: GameStatus;
  turn: GameColor;
  position: string;
  moves: GameMoveEntry[];
  moveCount: number;
  lastMove: GameMoveEntry | null;
  timeControl: GameTimeControl | null;
  rated: boolean;
  clocks: GameClocks;
  result: GameResult | null;
  winner: string | null;
  termination: string | null;
  drawOffer: GameDrawOffer | null;
  version: number;
  check: boolean;
  legalMoves: LegalMove[];
  players: GamePlayer[];
  startedAt: string;
  completedAt: string | null;
  lastMoveAt: string | null;
  shareSpectators: boolean;
  createdAt: string;
}

export interface GameInvitation {
  _id: string;
  from: GameUser | string;
  to: GameUser | string;
  gameType: GameType;
  timeControl: GameTimeControl | null;
  status: InviteStatus;
  conversation: string | null;
  message: string | null;
  game: string | null;
  expiresAt: string;
  createdAt: string;
}

/** `message.game` subdocument on chat messages. */
export interface GameBubbleData {
  kind: 'invitation' | 'active' | 'result';
  gameId?: string | null;
  invitationId?: string | null;
  gameType: GameType;
  timeControl?: {
    preset?: string;
    label?: string;
    category?: string;
    initialMs?: number | null;
    incrementMs?: number;
  } | null;
  status?: string;
  result?: GameResult;
  winner?: string | null;
  termination?: string;
  invitedBy?: string;
  inviteStatus?: InviteStatus;
}

export interface LeaderboardRow {
  rank: number;
  user: GameUser;
  rating: number;
  stats: { played: number; wins: number; losses: number; draws: number };
}

export interface RatingsSummary {
  chess: { rating: number; stats: { played: number; wins: number; losses: number; draws: number } };
  checkers: { rating: number; stats: { played: number; wins: number; losses: number; draws: number } };
  tic_tac_toe: { rating: number; stats: { played: number; wins: number; losses: number; draws: number } };
}

export const GAME_TYPE_OPTIONS: { type: GameType; label: string }[] = [
  { type: 'chess', label: 'chess' },
  { type: 'checkers', label: 'checkers' },
  { type: 'tic_tac_toe', label: 'tic-tac-toe' },
];

export const TIME_CONTROL_OPTIONS: { preset: string; label: string; category: GameTimeControl['category'] }[] = [
  { preset: 'bullet_1_0', label: '1+0 Bullet', category: 'bullet' },
  { preset: 'bullet_2_1', label: '2+1 Bullet', category: 'bullet' },
  { preset: 'blitz_3_0', label: '3+0 Blitz', category: 'blitz' },
  { preset: 'blitz_5_0', label: '5+0 Blitz', category: 'blitz' },
  { preset: 'rapid_10_0', label: '10+0 Rapid', category: 'rapid' },
  { preset: 'rapid_10_5', label: '10+5 Rapid', category: 'rapid' },
  { preset: 'untimed', label: 'Untimed', category: 'untimed' },
];

export const TERMINATION_LABELS: Record<string, string> = {
  checkmate: 'checkmate',
  stalemate: 'stalemate',
  insufficient_material: 'insufficient material',
  threefold_repetition: 'threefold repetition',
  fifty_move_rule: 'fifty-move rule',
  forty_move_rule: 'forty-move rule',
  no_legal_moves: 'no legal moves',
  line_complete: 'three in a row',
  board_full: 'full board',
  timeout: 'timeout',
  resignation: 'resignation',
  agreed_draw: 'agreement',
  invalid_position: 'agreement',
  draw: 'draw',
};

/** Human label for a game termination code (falls back to de-underscored code). */
export const terminationLabel = (code?: string | null): string =>
  !code ? '' : TERMINATION_LABELS[code] ?? code.replace(/_/g, ' ');
