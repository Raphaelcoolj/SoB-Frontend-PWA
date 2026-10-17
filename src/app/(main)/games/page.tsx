'use client';

// Games hub: pending invitations (incoming/outgoing), active games, and
// a per-game leaderboard with the viewer's ratings summary.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Crown,
  Swords,
  Grid3X3,
  Clock,
  Trophy,
  Users,
  Plus,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/Button';
import { UserAvatar } from '../../../components/user/UserAvatar';
import InviteModal from '../../../components/games/InviteModal';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import * as gameService from '../../../services/game';
import type { Game, GameInvitation, GameType, LeaderboardRow } from '../../../types/game';
import { gameTypeLabel, terminationLabel } from '../../../types/game';

const GAME_TYPES: GameType[] = ['chess', 'checkers', 'tic_tac_toe'];
const TYPE_ICONS: Record<GameType, typeof Crown> = {
  chess: Crown,
  checkers: Swords,
  tic_tac_toe: Grid3X3,
};
const LB_LABELS: Record<GameType, string> = {
  chess: 'chess',
  checkers: 'checkers',
  tic_tac_toe: 'tic-tac-toe',
};

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json();
  if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to load');
  return json.data;
};

const timeControlLabel = (tc: Game['timeControl']): string => {
  if (!tc || tc.category === 'untimed') return 'Untimed';
  const min = Math.floor((tc.initialMs || 0) / 60000);
  const sec = ((tc.initialMs || 0) % 60000) / 1000;
  const base = sec ? `${min}+${sec}` : `${min}`;
  return `${base} ${tc.category}`;
};

function InviteRow({
  invite,
  direction,
  onHandled,
}: {
  invite: GameInvitation;
  direction: 'incoming' | 'outgoing';
  onHandled: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const from = typeof invite.from === 'string' ? null : invite.from;
  const to = typeof invite.to === 'string' ? null : invite.to;
  const other = direction === 'incoming' ? from : to;

  const act = async (action: 'accept' | 'decline' | 'cancel') => {
    setBusy(true);
    try {
      if (action === 'accept') {
        const { game } = await gameService.acceptInvitation(invite._id);
        toast.success('Game accepted');
        onHandled();
        router.push(`/games/play/${game.gameId}`);
        return;
      }
      if (action === 'decline') await gameService.declineInvitation(invite._id);
      else await gameService.cancelInvitation(invite._id);
      toast.success(action === 'decline' ? 'Invitation declined' : 'Invitation cancelled');
      onHandled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
      <UserAvatar avatar={other?.avatar} name={other?.name || '?'} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{other?.name || 'Unknown user'}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          {(() => {
            const TypeIcon = TYPE_ICONS[invite.gameType] ?? Swords;
            return <TypeIcon className="w-3 h-3" />;
          })()}
          {gameTypeLabel(invite.gameType)} · {timeControlLabel(invite.timeControl)}
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {direction === 'incoming' ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => act('accept')} className="h-8 px-3">
              <Check className="w-3.5 h-3.5 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => act('decline')}
              className="h-8 px-3"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => act('cancel')}
            className="h-8 px-3"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function ActiveGameRow({ game }: { game: Game }) {
  const user = useAuthStore((s) => s.user);
  const me = game.players.find((p) => p.user._id === user?._id);
  const opp = game.players.find((p) => p.user._id !== user?._id);
  const myTurn = me && game.turn === me.color;
  return (
    <Link
      href={`/games/play/${game.gameId}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-accent/40 transition-colors"
    >
      <UserAvatar avatar={opp?.user.avatar} name={opp?.user.name || '?'} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          vs {opp?.user.name || 'Unknown'}
          <span className="text-muted-foreground font-normal">
            {' '}
            ({opp?.ratingAfter ?? opp?.ratingBefore ?? 1200})
          </span>
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          {gameTypeLabel(game.gameType)} · {timeControlLabel(game.timeControl)} · {game.moveCount} moves
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {myTurn && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/15 text-accent">
            Your turn
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function Leaderboard({ gameType }: { gameType: GameType }) {
  const { data, isLoading } = useSWR<LeaderboardRow[]>(
    `${BASE}/api/games/leaderboard/${gameType}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4 text-center">Loading…</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        No rated players yet. Win a rated game to enter the leaderboard.
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {data.map((row) => {
        const isMe = row.user._id === user?._id;
        return (
          <div
            key={row.user._id}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              isMe && 'bg-accent/10'
            )}
          >
            <span className="w-6 text-center text-xs font-bold tabular-nums text-muted-foreground">
              {row.rank}
            </span>
            <UserAvatar avatar={row.user.avatar} name={row.user.name} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {row.user.name}
                {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {row.stats.wins}W · {row.stats.losses}L · {row.stats.draws}D
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums">{row.rating}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function GamesPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState<'play' | 'leaderboard'>('play');
  const [lbType, setLbType] = useState<GameType>('chess');
  const [invitesNonce, setInvitesNonce] = useState(0);

  const { data: incoming } = useSWR<GameInvitation[]>(
    `${BASE}/api/games/invitations?direction=incoming&limit=50#${invitesNonce}`,
    () => gameService.listInvitations('incoming'),
    { refreshInterval: 10000 }
  );
  const { data: outgoing } = useSWR<GameInvitation[]>(
    `${BASE}/api/games/invitations?direction=outgoing&limit=50#${invitesNonce}`,
    () => gameService.listInvitations('outgoing'),
    { refreshInterval: 10000 }
  );
  const { data: activeGames } = useSWR<Game[]>(
    `${BASE}/api/games/my?status=active`,
    () => gameService.listMyGames({ status: 'active' }),
    { refreshInterval: 10000 }
  );
  const { data: completed } = useSWR<Game[]>(
    `${BASE}/api/games/my?status=completed`,
    () => gameService.listMyGames({ status: 'completed' }),
    { refreshInterval: 30000 }
  );
  const { data: ratings } = useSWR(`${BASE}/api/games/ratings/me`, () => gameService.getMyRatings(), {
    refreshInterval: 60000,
  });

  const refreshInvites = () => setInvitesNonce((n) => n + 1);

  const pendingIncoming = incoming?.filter((i) => i.status === 'pending') || [];
  const pendingOutgoing = outgoing?.filter((i) => i.status === 'pending') || [];
  const recentCompleted = (completed || []).slice(0, 10);

  return (
    <div className="pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Games</h1>
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Challenge
        </Button>
      </div>

      {/* Ratings summary */}
      {ratings && (
        <div className="grid grid-cols-3 gap-3">
          {GAME_TYPES.map((t) => {
            const TypeIcon = TYPE_ICONS[t];
            return (
              <div key={t} className="p-3 rounded-xl bg-card border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <TypeIcon className="w-3 h-3" />
                  {t === 'tic_tac_toe' ? 'TTT' : t}
                </p>
                <p className="text-2xl font-bold mt-1">{ratings[t].rating}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ratings[t].stats.played} played · {ratings[t].stats.wins}W{' '}
                  {ratings[t].stats.losses}L {ratings[t].stats.draws}D
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {(['play', 'leaderboard'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            {t === 'play' ? 'My games' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'play' && (
        <div className="space-y-6">
          {/* Incoming invitations */}
          {pendingIncoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Incoming invitations
              </h2>
              <div className="space-y-2">
                {pendingIncoming.map((inv) => (
                  <InviteRow key={inv._id} invite={inv} direction="incoming" onHandled={refreshInvites} />
                ))}
              </div>
            </section>
          )}

          {/* Outgoing pending */}
          {pendingOutgoing.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
                Outgoing invitations
              </h2>
              <div className="space-y-2">
                {pendingOutgoing.map((inv) => (
                  <InviteRow key={inv._id} invite={inv} direction="outgoing" onHandled={refreshInvites} />
                ))}
              </div>
            </section>
          )}

          {/* Active games */}
          <section>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Active games
            </h2>
            {activeGames && activeGames.length > 0 ? (
              <div className="space-y-2">
                {activeGames.map((g) => (
                  <ActiveGameRow key={g.gameId} game={g} />
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
                <p className="text-sm text-muted-foreground mb-3">No active games.</p>
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> Start a game
                </Button>
              </div>
            )}
          </section>

          {/* Recent results */}
          {recentCompleted.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Recent results</h2>
              <div className="space-y-2">
                {recentCompleted.map((g) => {
                  const user = useAuthStore.getState().user;
                  const me = g.players.find((p) => p.user._id === user?._id);
                  const opp = g.players.find((p) => p.user._id !== user?._id);
                  const won = g.winner && me && g.winner === me.user._id;
                  const draw = g.result === 'draw';
                  return (
                    <Link
                      key={g.gameId}
                      href={`/games/play/${g.gameId}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-accent/40 transition-colors"
                    >
                      <UserAvatar avatar={opp?.user.avatar} name={opp?.user.name || '?'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          vs {opp?.user.name}
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            ({gameTypeLabel(g.gameType)})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {draw ? 'Draw' : won ? 'Won' : 'Lost'} ·{' '}
                          {terminationLabel(g.termination)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          draw
                            ? 'bg-muted text-muted-foreground'
                            : won
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        )}
                      >
                        {draw ? '½' : won ? '+1' : '0'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
            {GAME_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setLbType(t)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors',
                  lbType === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {LB_LABELS[t]}
              </button>
            ))}
          </div>
          <Leaderboard gameType={lbType} />
        </div>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={() => {
          setInviteOpen(false);
          refreshInvites();
        }}
      />
    </div>
  );
}
