'use client';

// Live chess/checkers game page: board, clocks, move list, draw/resign,
// real-time socket updates. Server is the rule authority.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  ArrowLeft,
  Crown,
  Swords,
  Flag,
  Handshake,
  Check,
  X,
  Trophy,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../../components/ui/Button';
import { UserAvatar } from '../../../../../components/user/UserAvatar';
import ChessBoard from '../../../../../components/games/ChessBoard';
import CheckersBoard from '../../../../../components/games/CheckersBoard';
import ClockDisplay from '../../../../../components/games/ClockDisplay';
import MoveList from '../../../../../components/games/MoveList';
import { socket, connectSocket } from '../../../../../lib/socket';
import { useAuthStore } from '../../../../../store/authStore';
import * as gameService from '../../../../../services/game';
import type { Game, GameColor, LegalMove } from '../../../../../types/game';

const BASE = process.env.NEXT_PUBLIC_API_URL;

export default function PlayPage() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params?.gameId;
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: game, mutate } = useSWR<Game>(
    gameId ? `${BASE}/api/games/${gameId}` : null,
    () => gameService.getGame(gameId!),
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  // Socket: join game room + listen for updates.
  useEffect(() => {
    if (!gameId || !accessToken) return;
    connectSocket(accessToken);

    const join = () => socket.emit('game:join', { gameId });
    join();
    socket.on('connect', join);

    const onMove = (payload: { game?: Game; gameId?: string }) => {
      if (payload.game?.gameId === gameId || payload.gameId === gameId) {
        mutate(payload.game ? { ...payload.game } : undefined, { revalidate: true });
      }
    };
    const onCompleted = (payload: { game?: Game; gameId?: string }) => {
      if (payload.game?.gameId === gameId || payload.gameId === gameId) {
        mutate(payload.game ? { ...payload.game } : undefined, { revalidate: true });
        toast('Game completed');
      }
    };
    const onDrawOffered = (payload: { gameId?: string }) => {
      if (payload.gameId === gameId) mutate();
    };
    const onDrawDeclined = (payload: { gameId?: string }) => {
      if (payload.gameId === gameId) mutate();
    };

    socket.on('game:move', onMove);
    socket.on('game:completed', onCompleted);
    socket.on('game:draw-offered', onDrawOffered);
    socket.on('game:draw-declined', onDrawDeclined);

    return () => {
      socket.emit('game:leave', { gameId });
      socket.off('connect', join);
      socket.off('game:move', onMove);
      socket.off('game:completed', onCompleted);
      socket.off('game:draw-offered', onDrawOffered);
      socket.off('game:draw-declined', onDrawDeclined);
    };
  }, [gameId, accessToken, mutate]);

  const myPlayer = game?.players.find((p) => p.user._id === user?._id);
  const opponent = game?.players.find((p) => p.user._id !== user?._id);
  const myColor: GameColor | null = myPlayer?.color ?? null;
  const isParticipant = !!myPlayer;
  const isSpectator = game ? !isParticipant : false;
  const myTurn = game && myColor && game.turn === myColor && game.status === 'active';

  // Derived legal moves filtered for my pieces when it's my turn.
  const legalMoves: LegalMove[] = game?.legalMoves || [];

  const [busy, setBusy] = useState(false);
  const [drawResponse, setDrawResponse] = useState<'accept' | 'decline' | null>(null);

  const handleMove = useCallback(
    async (from: string, to: string, promotion?: string, captures?: string[]) => {
      if (!game || busy || !myTurn) return;
      setBusy(true);
      try {
        const updated = await gameService.makeMove(
          game.gameId,
          { from, to, promotion, captures },
          game.version
        );
        mutate({ ...updated }, { revalidate: false });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Move failed');
        mutate(); // re-sync in case the server state diverged
      } finally {
        setBusy(false);
      }
    },
    [game, busy, myTurn, mutate]
  );

  const handleResign = async () => {
    if (!game) return;
    if (!window.confirm('Resign this game?')) return;
    setBusy(true);
    try {
      const updated = await gameService.resignGame(game.gameId);
      mutate({ ...updated }, { revalidate: false });
      toast.success('You resigned');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Resign failed');
    } finally {
      setBusy(false);
    }
  };

  const handleOfferDraw = async () => {
    if (!game) return;
    setBusy(true);
    try {
      const updated = await gameService.offerDraw(game.gameId);
      mutate({ ...updated }, { revalidate: false });
      toast.success('Draw offered');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Draw offer failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDrawResponse = async (accept: boolean) => {
    if (!game) return;
    setBusy(true);
    try {
      const updated = await gameService.respondDraw(game.gameId, accept);
      mutate({ ...updated }, { revalidate: false });
      setDrawResponse(null);
      toast.success(accept ? 'Draw accepted' : 'Draw declined');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const copyGameLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success('Link copied');
  };

  if (!gameId) {
    return (
      <div className="p-6 text-center text-muted-foreground">Missing game ID</div>
    );
  }

  if (!game) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading game…</p>
      </div>
    );
  }

  const orientation: 'white' | 'black' = myColor ?? 'white';
  const isChess = game.gameType === 'chess';
  const TypeIcon = isChess ? Crown : Swords;

  // Draw offer pending for me?
  const drawOfferForMe =
    game.drawOffer && isParticipant && game.drawOffer.by !== user?._id;

  const resultText = (() => {
    if (game.status !== 'completed') return null;
    if (game.result === 'draw') return `Draw · ${game.termination?.replace(/_/g, ' ')}`;
    const winner = game.players.find((p) => p.user._id === game.winner);
    const won = game.winner === user?._id;
    return `${won ? 'You won' : `${winner?.user.name || 'Opponent'} won`} · ${game.termination?.replace(/_/g, ' ')}`;
  })();

  return (
    <div className="pb-20 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <TypeIcon className="w-4 h-4" /> {game.gameType}
            {game.timeControl && (
              <span className="text-muted-foreground font-normal">
                {' · '}
                {game.timeControl.label || game.timeControl.preset}
              </span>
            )}
          </p>
          {resultText && (
            <p className="text-xs text-muted-foreground mt-0.5">{resultText}</p>
          )}
        </div>
        <button
          type="button"
          onClick={copyGameLink}
          aria-label="Copy game link"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Copy link (spectate if shared)"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Opponent row */}
      {opponent && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <UserAvatar
            avatar={opponent.user.avatar}
            name={opponent.user.name}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {opponent.user.name}
              <span className="text-muted-foreground font-normal">
                {' '}
                ({opponent.ratingAfter ?? opponent.ratingBefore ?? 1200})
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {opponent.color}
            </p>
          </div>
          <ClockDisplay
            clocks={game.clocks}
            turn={game.turn}
            color={opponent.color}
            running={game.status === 'active'}
          />
        </div>
      )}

      {/* Board */}
      <div className="relative">
        {isChess ? (
          <ChessBoard
            fen={game.position}
            legalMoves={legalMoves}
            orientation={orientation}
            lastMove={game.lastMove ? { from: game.lastMove.from, to: game.lastMove.to } : null}
            check={game.check}
            interactive={!!myTurn && !busy}
            onMove={(from, to, promotion) => handleMove(from, to, promotion)}
          />
        ) : (
          <CheckersBoard
            position={game.position}
            legalMoves={legalMoves}
            orientation={orientation}
            lastMove={game.lastMove ? { from: game.lastMove.from, to: game.lastMove.to } : null}
            interactive={!!myTurn && !busy}
            onMove={(from, to, captures) => handleMove(from, to, undefined, captures)}
          />
        )}
        {game.status === 'completed' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xl text-center max-w-[260px]">
              <Trophy className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <p className="text-lg font-bold">{resultText}</p>
              <Link
                href="/games"
                className="inline-block mt-4 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
              >
                Back to games
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* My player row */}
      {myPlayer && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <UserAvatar avatar={myPlayer.user.avatar} name={myPlayer.user.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              You
              <span className="text-muted-foreground font-normal">
                {' '}
                ({myPlayer.ratingAfter ?? myPlayer.ratingBefore ?? 1200})
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground capitalize">{myPlayer.color}</p>
          </div>
          <ClockDisplay
            clocks={game.clocks}
            turn={game.turn}
            color={myPlayer.color}
            running={game.status === 'active'}
          />
        </div>
      )}

      {isSpectator && (
        <p className="text-xs text-muted-foreground text-center py-1">
          You are spectating
        </p>
      )}

      {/* Draw offer prompt */}
      {drawOfferForMe && drawResponse === null && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
          <Handshake className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm flex-1">Opponent offers a draw</p>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => handleDrawResponse(true)}
            className="h-8 px-3"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => handleDrawResponse(false)}
            className="h-8 px-3"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Move list */}
      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <MoveList moves={game.moves} />
      </div>

      {/* Actions */}
      {isParticipant && game.status === 'active' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !!game.drawOffer}
            onClick={handleOfferDraw}
            className="flex-1"
          >
            <Handshake className="w-4 h-4 mr-1.5" />
            {game.drawOffer ? 'Draw offered' : 'Offer draw'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={handleResign}
            className="flex-1"
          >
            <Flag className="w-4 h-4 mr-1.5" /> Resign
          </Button>
        </div>
      )}

      {/* Rating delta after completion */}
      {game.status === 'completed' && myPlayer?.ratingAfter != null && (
        <div className="p-3 rounded-xl bg-card border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Your rating</p>
          <p className="text-xl font-bold">
            {myPlayer.ratingAfter}
            {myPlayer.ratingBefore != null && myPlayer.ratingAfter !== myPlayer.ratingBefore && (
              <span
                className={
                  myPlayer.ratingAfter > myPlayer.ratingBefore
                    ? 'text-green-500 ml-2 text-sm'
                    : 'text-red-500 ml-2 text-sm'
                }
              >
                {myPlayer.ratingAfter > myPlayer.ratingBefore ? '+' : ''}
                {myPlayer.ratingAfter - myPlayer.ratingBefore}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
