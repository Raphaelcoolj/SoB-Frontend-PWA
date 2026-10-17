// Game (chess, checkers, tic-tac-toe) API service — mirrors SoB-Backend-API /api/games.
import { fetchWithAuth } from '../lib/api';
import type {
  Game,
  GameInvitation,
  GameType,
  LeaderboardRow,
  RatingsSummary,
} from '../types/game';

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || 'Request failed');
  }
  return json.data as T;
}

// Invitations -----------------------------------------------------------------

export const createInvitation = async (body: {
  to: string;
  gameType: GameType;
  timeControl: string;
  conversationId?: string;
}) =>
  unwrap<{ invitation: GameInvitation; token: string; conversationId: string }>(
    await fetchWithAuth('/api/games/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

export const acceptInvitation = async (id: string) =>
  unwrap<{ game: Game; invitation: GameInvitation }>(
    await fetchWithAuth(`/api/games/invitations/${id}/accept`, { method: 'POST' })
  );

export const declineInvitation = async (id: string) =>
  unwrap<{ invitation: GameInvitation }>(
    await fetchWithAuth(`/api/games/invitations/${id}/decline`, { method: 'POST' })
  );

export const cancelInvitation = async (id: string) =>
  unwrap<{ invitation: GameInvitation }>(
    await fetchWithAuth(`/api/games/invitations/${id}/cancel`, { method: 'POST' })
  );

export const listInvitations = async (direction: 'incoming' | 'outgoing' = 'incoming') =>
  unwrap<{ invitations: GameInvitation[] }>(
    await fetchWithAuth(`/api/games/invitations?direction=${direction}&limit=50`)
  ).then((r) => r.invitations);

// Games -----------------------------------------------------------------------

export const getGame = async (gameId: string, spectateToken?: string) => {
  const q = spectateToken ? `?spectate=${encodeURIComponent(spectateToken)}` : '';
  return unwrap<{ game: Game }>(await fetchWithAuth(`/api/games/${gameId}${q}`)).then(
    (r) => r.game
  );
};

export const listMyGames = async (params: { gameType?: GameType; status?: 'active' | 'completed' } = {}) => {
  const q = new URLSearchParams();
  if (params.gameType) q.set('gameType', params.gameType);
  if (params.status) q.set('status', params.status);
  const qs = q.toString();
  return unwrap<{ games: Game[] }>(await fetchWithAuth(`/api/games/my${qs ? `?${qs}` : ''}`)).then(
    (r) => r.games
  );
};

export const makeMove = async (
  gameId: string,
  move: { from?: string | null; to: string; promotion?: string; captures?: string[]; cell?: number },
  expectedVersion?: number
) =>
  unwrap<{ game: Game }>(
    await fetchWithAuth(`/api/games/${gameId}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ move, expectedVersion }),
    })
  ).then((r) => r.game);

export const resignGame = async (gameId: string) =>
  unwrap<{ game: Game }>(
    await fetchWithAuth(`/api/games/${gameId}/resign`, { method: 'POST' })
  ).then((r) => r.game);

export const offerDraw = async (gameId: string) =>
  unwrap<{ game: Game }>(
    await fetchWithAuth(`/api/games/${gameId}/draw/offer`, { method: 'POST' })
  ).then((r) => r.game);

export const respondDraw = async (gameId: string, accept: boolean) =>
  unwrap<{ game: Game }>(
    await fetchWithAuth(`/api/games/${gameId}/draw/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    })
  ).then((r) => r.game);

// Ratings ---------------------------------------------------------------------

export const getMyRatings = async () =>
  unwrap<RatingsSummary>(await fetchWithAuth('/api/games/ratings/me'));

export const getUserRatings = async (userId: string) =>
  unwrap<RatingsSummary>(await fetchWithAuth(`/api/games/ratings/${userId}`));

export const getLeaderboard = async (gameType: GameType) =>
  unwrap<{ leaderboard: LeaderboardRow[] }>(
    await fetchWithAuth(`/api/games/leaderboard/${gameType}`)
  ).then((r) => r.leaderboard);
