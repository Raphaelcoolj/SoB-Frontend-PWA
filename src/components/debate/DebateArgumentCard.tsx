'use client';

/**
 * @file DebateArgumentCard.tsx
 * @description A FOR/AGAINST argument card with optional evidence, community
 * support (upvote = support, downvote = oppose), rebuttals and moderation
 * actions. Supports shallow nesting for rebuttal threads (max depth 3) so the
 * tree never spirals out of control. Color never carries meaning alone — side
 * and vote states always include text labels/aria.
 */

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  ArrowBigUp,
  ArrowBigDown,
  ExternalLink,
  MessageSquare,
  Trash2,
  Flag,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { UserAvatar } from '../user/UserAvatar';
import MentionText from '../shared/MentionText';
import MentionTextarea from '../shared/MentionTextarea';
import { useAuth } from '../../hooks/useAuth';
import { track } from '../../lib/analytics';
import { formatDistanceToNow } from '../../lib/utils';
import {
  createArgument,
  deleteArgument,
  getRebuttals,
  toggleOppose,
  toggleSupport,
  reportArgument,
} from '../../services/debate';
import type { DebateArgument, DebateSide } from '../../types/debate';

const MAX_DEPTH = 3;
const REPORT_REASONS = ['spam', 'harassment', 'hate_speech', 'violence', 'sexual_content', 'self_harm', 'other'];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

interface RebuttalComposerProps {
  argument: DebateArgument;
  defaultSide: DebateSide;
  debateId: string;
  onCreated: (arg: DebateArgument) => void;
}

function RebuttalComposer({ argument, defaultSide, debateId, onCreated }: RebuttalComposerProps) {
  const { user } = useAuth();
  const [side, setSide] = useState<DebateSide>(defaultSide);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim() || busy) return;
    if (!user) {
      setError('Login to rebut');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createArgument(debateId, {
        side,
        body: body.trim(),
        parentArgumentId: argument._id,
      });
      setBody('');
      track({ event: 'argument_rebutted', properties: { debateId: String(argument.debate), argumentId: argument._id, side } });
      onCreated(created);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 border border-accent/30 rounded-xl p-3 bg-accent/5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground">Your stance:</span>
        <button
          type="button"
          onClick={() => setSide('FOR')}
          aria-pressed={side === 'FOR'}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            side === 'FOR' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          FOR
        </button>
        <button
          type="button"
          onClick={() => setSide('AGAINST')}
          aria-pressed={side === 'AGAINST'}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            side === 'AGAINST' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          AGAINST
        </button>
      </div>
      <MentionTextarea
        value={body}
        onChange={setBody}
        placeholder={`Write your ${side} rebuttal...`}
        maxLength={5000}
        rows={3}
        className="w-full text-sm bg-background border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || busy}
          className="px-4 py-1.5 bg-accent text-white text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
          Post rebuttal
        </button>
      </div>
    </div>
  );
}

interface ReportMenuProps {
  onReport: (reason: string) => void;
}

function ReportMenu({ onReport }: ReportMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Report argument"
        aria-expanded={open}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10"
      >
        <Flag className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-20 w-40 rounded-xl border border-border bg-popover shadow-lg p-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">Report reason</p>
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => {
                onReport(reason);
                setOpen(false);
              }}
              className="block w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-muted capitalize"
            >
              {reason.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DebateArgumentCardProps {
  argument: DebateArgument;
  depth?: number;
  debateId?: string;
}

export function DebateArgumentCard({ argument, depth = 0, debateId: debateIdProp }: DebateArgumentCardProps) {
  const resolvedDebateId = debateIdProp || argument.debate;
  const { user } = useAuth();
  const [voteState, setVoteState] = useState({
    isSupported: argument.isSupported,
    isDownvoted: argument.isDownvoted,
    supportsCount: argument.supportsCount,
    downvotesCount: argument.downvotesCount,
  });
  const [showRebuttalComposer, setShowRebuttalComposer] = useState(false);
  const [showRebuttals, setShowRebuttals] = useState(argument.rebuttalCount > 0);
  const [rebuttals, setRebuttals] = useState<DebateArgument[]>([]);
  const [rebuttalsTotal, setRebuttalsTotal] = useState(argument.rebuttalCount || 0);
  const [rebuttalsLoading, setRebuttalsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const author = typeof argument.author === 'object' ? argument.author : null;
  const isOwn = user && author && user._id === author._id;
  const isAdmin = user?.role === 'admin';

  const toggleVote = async (kind: 'support' | 'oppose') => {
    if (busy) return;
    setBusy(true);
    const prev = { ...voteState };
    if (kind === 'support') {
      const turningOn = !prev.isSupported;
      setVoteState({
        ...prev,
        isSupported: turningOn,
        isDownvoted: false,
        supportsCount: Math.max(0, prev.supportsCount + (turningOn ? 1 : -1)),
        downvotesCount: prev.isDownvoted && turningOn ? Math.max(0, prev.downvotesCount - 1) : prev.downvotesCount,
      });
    } else {
      const turningOn = !prev.isDownvoted;
      setVoteState({
        ...prev,
        isDownvoted: turningOn,
        isSupported: false,
        downvotesCount: Math.max(0, prev.downvotesCount + (turningOn ? 1 : -1)),
        supportsCount: prev.isSupported && turningOn ? Math.max(0, prev.supportsCount - 1) : prev.supportsCount,
      });
    }
    try {
      const result = kind === 'support' ? await toggleSupport(argument._id) : await toggleOppose(argument._id);
      setVoteState({
        isSupported: result.isSupported,
        isDownvoted: result.isDownvoted,
        supportsCount: result.supportsCount,
        downvotesCount: result.downvotesCount,
      });
      track({
        event: kind === 'support' ? (result.isSupported ? 'argument_supported' : 'argument_unsupported') : 'argument_opposed',
        properties: { argumentId: argument._id },
      });
    } catch {
      setVoteState(prev);
      setError('Could not update vote');
    } finally {
      setBusy(false);
    }
  };

  const loadRebuttals = useCallback(async () => {
    if (rebuttals.length > 0 || rebuttalsLoading) return;
    setRebuttalsLoading(true);
    try {
      const data = await getRebuttals(argument._id, { page: 1, limit: 10 });
      setRebuttals(data.rebuttals);
      setRebuttalsTotal(data.pagination.total);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRebuttalsLoading(false);
    }
  }, [argument._id, rebuttals.length, rebuttalsLoading]);

  React.useEffect(() => {
    if (showRebuttals && argument.rebuttalCount > 0) {
      const t = setTimeout(loadRebuttals, 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!window.confirm('Delete this argument?')) return;
    try {
      await deleteArgument(argument._id);
      setDeleted(true);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await reportArgument(argument._id, reason);
      track({ event: 'argument_reported', properties: { argumentId: argument._id, reason } });
      setError(null);
      window.alert('Argument reported.');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (deleted) return null;

  const sideClasses =
    argument.side === 'FOR'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      : 'bg-red-500/10 text-red-500 border-red-500/30';

  return (
    <article
      id={`argument-${argument._id}`}
      className={`border border-border rounded-xl p-4 bg-card ${depth > 0 ? 'ml-4 md:ml-8' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sideClasses}`}>{argument.side}</span>
        {author && (
          <Link href={`/profile/${author.username}`} className="flex items-center gap-1.5 min-w-0 group">
            <UserAvatar avatar={author.avatar} name={author.name} size="sm" />
            <span className="text-xs font-semibold text-foreground truncate group-hover:underline">{author.name}</span>
            <span className="text-[10px] text-muted-foreground group-hover:text-accent">@{author.username}</span>
          </Link>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
          {formatDistanceToNow(argument.createdAt)}
        </span>
      </div>

      <MentionText text={argument.body} className="text-sm text-foreground whitespace-pre-wrap" />

      {argument.evidence?.url && (
        <a
          href={argument.evidence.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:underline max-w-full truncate"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{argument.evidence.title || argument.evidence.url}</span>
        </a>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => toggleVote('support')}
          disabled={busy}
          aria-pressed={voteState.isSupported}
          aria-label="Support this argument"
          title="Support"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            voteState.isSupported
              ? 'bg-emerald-500/15 text-emerald-600'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <ArrowBigUp className={`w-4 h-4 ${voteState.isSupported ? 'fill-current' : ''}`} />
          {voteState.supportsCount}
        </button>
        <button
          type="button"
          onClick={() => toggleVote('oppose')}
          disabled={busy}
          aria-pressed={voteState.isDownvoted}
          aria-label="Oppose this argument"
          title="Oppose"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            voteState.isDownvoted
              ? 'bg-red-500/15 text-red-500'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <ArrowBigDown className={`w-4 h-4 ${voteState.isDownvoted ? 'fill-current' : ''}`} />
          {voteState.downvotesCount}
        </button>

        <button
          type="button"
          onClick={() => setShowRebuttalComposer((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Rebut
        </button>

        <button
          type="button"
          onClick={() => {
            setShowRebuttals((v) => !v);
            if (!showRebuttals) loadRebuttals();
          }}
          aria-expanded={showRebuttals}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {showRebuttals ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Rebuttals ({rebuttalsTotal})
        </button>

        <div className="ml-auto flex items-center gap-1">
          {(isOwn || isAdmin) && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete argument"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <ReportMenu onReport={handleReport} />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {showRebuttalComposer && resolvedDebateId && (
        <RebuttalComposer
          argument={argument}
          defaultSide={argument.side === 'FOR' ? 'AGAINST' : 'FOR'}
          debateId={resolvedDebateId}
          onCreated={(reb) => {
            setRebuttals((prev) => [...prev, reb]);
            setRebuttalsTotal((t) => t + 1);
            setShowRebuttalComposer(false);
          }}
        />
      )}

      {showRebuttals && (
        <div className="mt-3 space-y-2">
          {rebuttalsLoading && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {rebuttals.length === 0 && !rebuttalsLoading && (
            <p className="text-xs text-muted-foreground py-1">No rebuttals yet.</p>
          )}
          {rebuttals.map((reb) => (
            <DebateArgumentCard key={reb._id} argument={reb} depth={Math.min(depth + 1, MAX_DEPTH)} debateId={resolvedDebateId} />
          ))}
          {rebuttals.length > 0 && rebuttals.length < rebuttalsTotal && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const data = await getRebuttals(argument._id, { page: Math.floor(rebuttals.length / 10) + 1, limit: 10 });
                  setRebuttals((prev) => [...prev, ...data.rebuttals]);
                } catch (e) {
                  setError(errMsg(e));
                }
              }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </article>
  );
}
