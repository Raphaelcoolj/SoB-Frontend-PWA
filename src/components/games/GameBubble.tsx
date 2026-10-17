'use client';

// Chat bubble renderer for `message.game` subdocuments — invitation,
// active-game, and result cards embedded in the message list.

import { useState } from 'react';
import Link from 'next/link';
import { Crown, Swords, Check, X, Trophy, Handshake, Share2, Grid3X3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import type { GameBubbleData, GameType, InviteStatus } from '../../types/game';
import { terminationLabel } from '../../types/game';

interface GameBubbleProps {
  data: GameBubbleData;
  mine: boolean;
  /** Called when the viewer acts on a pending invitation (optimistic UI). */
  onInvitationHandled?: () => void;
}

const TYPE_META: Record<GameType, { label: string; icon: typeof Crown }> = {
  chess: { label: 'Chess', icon: Crown },
  checkers: { label: 'Checkers', icon: Swords },
  tic_tac_toe: { label: 'Tic-tac-toe', icon: Grid3X3 },
};

const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const formatTimeControl = (tc: GameBubbleData['timeControl']): string => {
  if (!tc) return 'Untimed';
  if (tc.category === 'untimed' || tc.initialMs == null) return 'Untimed';
  const initialMin = Math.floor(tc.initialMs / 60000);
  const initialSec = (tc.initialMs % 60000) / 1000;
  const base = initialSec ? `${initialMin}+${initialSec}` : `${initialMin}`;
  return `${base} ${tc.category}`;
};

export default function GameBubble({ data, mine, onInvitationHandled }: GameBubbleProps) {
  const user = useAuthStore((s) => s.user);
  const meta = TYPE_META[data.gameType] || TYPE_META.chess;
  const Icon = meta.icon;
  const [copied, setCopied] = useState(false);

  // Determine viewer's action affordance on invitations.
  const invitePending = data.kind === 'invitation' && data.inviteStatus === 'pending';
  const canAccept = invitePending && !mine && data.invitedBy !== user?._id;
  const canCancel = invitePending && mine;

  const gameId = data.gameId || (data.kind === 'invitation' ? null : null);
  const playHref = gameId ? `/games/play/${gameId}` : null;
  const inviteHref = data.invitationId ? `/games/invite/${data.invitationId}/accept` : null;

  const handleShare = async () => {
    const url = inviteHref ? `${window.location.origin}${inviteHref}` : playHref ? `${window.location.origin}${playHref}` : null;
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Game invitation', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link copied');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user dismissed share sheet
    }
  };

  const resultText = (() => {
    if (data.kind !== 'result') return null;
    const winnerName = data.result === 'draw' ? null : data.result === 'white' ? 'White' : 'Black';
    const term = data.termination ? ` · ${terminationLabel(data.termination)}` : '';
    if (data.result === 'draw') return `Draw${term}`;
    const isWinner = user && data.winner === user._id;
    return isWinner ? `You won${term}` : `${winnerName} won${term}`;
  })();

  return (
    <div
      className={cn(
        'w-[min(280px,100%)] rounded-2xl border overflow-hidden',
        mine
          ? 'bg-accent text-white border-accent/40 rounded-br-[4px]'
          : 'bg-card text-foreground border-border/60 rounded-bl-[4px]'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 border-b',
          mine ? 'bg-accent/20 border-white/10' : 'bg-muted/50 border-border/40'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {meta.label} · {formatTimeControl(data.timeControl)}
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        {data.kind === 'invitation' && (
          <>
            <p className="text-sm">
              {mine ? 'You invited them to a game.' : 'wants to play a game with you.'}
            </p>
            {data.inviteStatus && data.inviteStatus !== 'pending' && (
              <p className="text-xs opacity-75">{INVITE_STATUS_LABEL[data.inviteStatus]}</p>
            )}
            {canAccept && (
              <div className="flex gap-2 pt-0.5">
                <Link
                  href={`/games/invite/${data.invitationId}/accept`}
                  onClick={onInvitationHandled}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-accent text-xs font-semibold hover:bg-white/90 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </Link>
                <Link
                  href={`/games/invite/${data.invitationId}/decline`}
                  onClick={onInvitationHandled}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-semibold hover:bg-black/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Decline
                </Link>
              </div>
            )}
            {canCancel && (
              <Link
                href={`/games/invite/${data.invitationId}/cancel`}
                onClick={onInvitationHandled}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-semibold hover:bg-black/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </Link>
            )}
            {mine && !invitePending && data.invitationId && (
              <p className="text-xs opacity-75">Invitation {data.inviteStatus}</p>
            )}
            {mine && invitePending && inviteHref && (
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                data-testid="game-invite-share"
              >
                <Share2 className="w-3 h-3" />
                {copied ? 'Copied!' : 'Share link'}
              </button>
            )}
          </>
        )}

        {data.kind === 'active' && (
          <>
            <p className="text-sm">Game in progress</p>
            {playHref && (
              <Link
                href={playHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-accent text-xs font-semibold hover:bg-white/90 transition-colors"
              >
                <Swords className="w-3.5 h-3.5" /> Watch / Play
              </Link>
            )}
          </>
        )}

        {data.kind === 'result' && (
          <>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {data.result === 'draw' ? (
                <Handshake className="w-4 h-4" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              <span>{resultText}</span>
            </div>
            {playHref && (
              <Link
                href={playHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-accent text-xs font-semibold hover:bg-white transition-colors"
              >
                View game
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
