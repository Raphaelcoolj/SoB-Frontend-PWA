'use client';

/**
 * @file DebateSection.tsx
 * @description The full structured Debate experience for articles:
 * proposition header with live FOR/AGAINST split, side selector, argument
 * cards with evidence/support/rebuttals, and the "Start a Debate" creation
 * flow. Debate state (OPEN/CLOSED/LOCKED) is enforced server-side; the UI
 * reflects it and never lets a user submit into a closed/locked debate.
 */

import React, { useEffect, useState } from 'react';
import {
  Swords,
  Loader2,
  Lock,
  CheckCircle2,
  Flag,
  Plus,
} from 'lucide-react';
import { UserAvatar } from '../user/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { track } from '../../lib/analytics';
import { formatDistanceToNow } from '../../lib/utils';
import { DebateArgumentCard } from './DebateArgumentCard';
import {
  closeDebate,
  createArgument,
  createDebate,
  getArguments,
  getDebatesByContent,
  reportDebate,
} from '../../services/debate';
import type { Debate, DebateArgument, DebateSide } from '../../types/debate';

const REPORT_REASONS = ['spam', 'harassment', 'hate_speech', 'violence', 'sexual_content', 'self_harm', 'other'];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

interface DebateSectionProps {
  postId: string;
  contentType: 'article' | 'post';
  initialArgumentId?: string;
}

function StartDebateComposer({
  postId,
  contentType,
  onCreated,
}: {
  postId: string;
  contentType: 'article' | 'post';
  onCreated: (debate: Debate) => void;
}) {
  const { user } = useAuth();
  const [proposition, setProposition] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (proposition.trim().length < 10 || busy) return;
    if (!user) {
      setError('Login to start a debate');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createDebate({
        contentId: postId,
        contentType,
        proposition: proposition.trim(),
        closingDate: closingDate ? new Date(closingDate).toISOString() : null,
      });
      track({ event: 'debate_created', properties: { contentId: postId, contentType } });
      onCreated(created);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-dashed border-accent/40 rounded-2xl p-5 bg-accent/5">
      <div className="flex items-center gap-2 mb-1">
        <Swords className="w-4 h-4 text-accent" />
        <h3 className="font-bold text-foreground">Start a Debate</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Turn this content into structured disagreement. Write a clear, debatable proposition.
      </p>
      <textarea
        value={proposition}
        onChange={(e) => setProposition(e.target.value)}
        placeholder='e.g. "Universities should make AI literacy mandatory."'
        maxLength={300}
        rows={3}
        className="w-full text-sm bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{proposition.length}/300</span>
          <label className="flex items-center gap-1">
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="text-xs bg-background border border-border rounded-lg px-2 py-1"
            />
            <span className="hidden sm:inline">closes</span>
          </label>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={proposition.trim().length < 10 || busy}
          className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center gap-1"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Start Debate
        </button>
      </div>
      {proposition.trim().length > 0 && proposition.trim().length < 10 && (
        <p className="text-xs text-amber-500 mt-1">Proposition must be at least 10 characters.</p>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SideTabs({
  side,
  onChange,
  forCount,
  againstCount,
}: {
  side: DebateSide;
  onChange: (s: DebateSide) => void;
  forCount: number;
  againstCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange('FOR')}
        aria-pressed={side === 'FOR'}
        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
          side === 'FOR'
            ? 'bg-emerald-500 text-white border-emerald-500'
            : 'border-border text-emerald-600 bg-card hover:bg-emerald-500/5'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <span>FOR</span>
          <span className="text-xs opacity-80">{forCount}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange('AGAINST')}
        aria-pressed={side === 'AGAINST'}
        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
          side === 'AGAINST'
            ? 'bg-red-500 text-white border-red-500'
            : 'border-border text-red-500 bg-card hover:bg-red-500/5'
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          <span>AGAINST</span>
          <span className="text-xs opacity-80">{againstCount}</span>
        </span>
      </button>
    </div>
  );
}

function ArgumentComposer({
  debateId,
  side,
  status,
  onCreated,
}: {
  debateId: string;
  side: DebateSide;
  status: Debate['status'];
  onCreated: (arg: DebateArgument) => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim() || busy) return;
    if (!user) {
      setError('Login to argue');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createArgument(debateId, {
        side,
        body: body.trim(),
        evidence: evidenceUrl.trim() ? { url: evidenceUrl.trim() } : null,
      });
      setBody('');
      setEvidenceUrl('');
      track({ event: 'argument_created', properties: { debateId, side } });
      onCreated(created);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={status !== 'OPEN' || !user}
        placeholder={
          !user ? 'Login to argue' : status !== 'OPEN' ? 'This debate is not open for new arguments.' : `Make a ${side} argument...`
        }
        maxLength={5000}
        rows={3}
        className={`w-full text-sm bg-background border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent ${
          status !== 'OPEN' ? 'opacity-60' : ''
        }`}
      />
      <div className="flex items-center gap-2 mt-2">
        <input
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          disabled={status !== 'OPEN' || !user}
          placeholder="Evidence URL (optional)"
          className="flex-1 text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || busy || status !== 'OPEN'}
          className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Argue'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function ReportMenu({ onReport }: { onReport: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Report debate"
        aria-expanded={open}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10"
      >
        <Flag className="w-4 h-4" />
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

interface DebateViewProps {
  debate: Debate;
  currentUserId?: string;
  onDebateChanged: (d: Debate) => void;
}

function DebateView({ debate: initial, currentUserId, onDebateChanged }: DebateViewProps) {
  const [debate, setDebate] = useState<Debate>(initial);
  const [side, setSide] = useState<DebateSide>('FOR');
  const [args, setArgs] = useState<DebateArgument[]>([]);
  const [argsLoading, setArgsLoading] = useState(true);
  const [argsError, setArgsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  const creator = typeof debate.creator === 'object' ? debate.creator : null;
  const isCreator = currentUserId && (creator ? creator._id === currentUserId : String(debate.creator) === currentUserId);
  const isOpen = debate.status === 'OPEN';

  const loadPage = async (targetPage: number, targetSide: DebateSide, append: boolean) => {
    setArgsLoading(true);
    setArgsError(null);
    try {
      const data = await getArguments(debate._id, { side: targetSide, page: targetPage, limit: 10 });
      setArgs((prev) => (append ? [...prev, ...data.arguments] : data.arguments));
      setTotal(data.pagination.total);
      setPage(targetPage);
    } catch (e) {
      setArgsError(errMsg(e));
    } finally {
      setArgsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadPage(1, side, false);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, debate._id]);

  const handleClose = async () => {
    if (!window.confirm('Close this debate to new arguments?')) return;
    setBusy(true);
    try {
      const updated = await closeDebate(debate._id);
      setDebate(updated);
      onDebateChanged(updated);
      track({ event: 'debate_closed', properties: { debateId: debate._id } });
    } catch (e) {
      setArgsError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await reportDebate(debate._id, reason);
      track({ event: 'debate_reported', properties: { debateId: debate._id, reason } });
      window.alert('Debate reported.');
    } catch (e) {
      setArgsError(errMsg(e));
    }
  };

  const forPct = debate.stats?.forPct ?? 50;
  const againstPct = debate.stats?.againstPct ?? 50;

  return (
    <div>
      {/* Proposition header */}
      <div className="border border-border rounded-2xl p-5 bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Swords className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Debate</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              debate.status === 'OPEN'
                ? 'bg-emerald-500/10 text-emerald-600'
                : debate.status === 'CLOSED'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-red-500/10 text-red-500'
            }`}
          >
            {debate.status}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {isCreator && isOpen && (
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                aria-label="Close debate"
                title="Close debate"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            <ReportMenu onReport={handleReport} />
          </div>
        </div>

        <blockquote className="text-lg font-bold leading-snug text-foreground">&ldquo;{debate.proposition}&rdquo;</blockquote>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          {creator && (
            <span className="flex items-center gap-1">
              <UserAvatar avatar={creator.avatar} name={creator.name} size="xs" />
              Started by {creator.name}
            </span>
          )}
          {debate.closingDate && <span>· closes {formatDistanceToNow(debate.closingDate)}</span>}
          <span>· {debate.argumentCount} arguments</span>
        </div>

        {/* FOR/AGAINST split — text labels always accompany color. */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] font-bold text-emerald-600 shrink-0">FOR {forPct}%</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex" role="img" aria-label={`For ${forPct}%, against ${againstPct}%`}>
            <div className="bg-emerald-500 h-full" style={{ width: `${forPct}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${againstPct}%` }} />
          </div>
          <span className="text-[10px] font-bold text-red-500 shrink-0">AGAINST {againstPct}%</span>
        </div>

        {debate.status === 'LOCKED' && (
          <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> This debate was locked by moderators. New arguments are disabled.
          </p>
        )}
        {debate.status === 'CLOSED' && !debate.summary && (
          <p className="mt-3 text-xs text-muted-foreground">This debate is closed to new arguments but remains readable.</p>
        )}
        {debate.summary && (
          <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">{debate.summary}</p>
        )}
      </div>

      {/* Side selector */}
      <div className="mt-4">
        <SideTabs
          side={side}
          onChange={setSide}
          forCount={debate.stats?.forCount ?? 0}
          againstCount={debate.stats?.againstCount ?? 0}
        />
      </div>

      {/* Argument composer */}
      <div className="mt-3">
        <ArgumentComposer
          debateId={debate._id}
          side={side}
          status={debate.status}
          onCreated={(arg) => {
            setArgs((prev) => [arg, ...prev]);
            setTotal((t) => t + 1);
            setDebate((d) => ({
              ...d,
              argumentCount: d.argumentCount + 1,
              stats: {
                ...d.stats,
                ...(arg.side === 'FOR' ? { forCount: d.stats.forCount + 1 } : { againstCount: d.stats.againstCount + 1 }),
              },
            }));
          }}
        />
      </div>

      {/* Argument list */}
      <div className="mt-3 space-y-3">
        {argsLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {argsError && <p className="text-red-500 text-sm">{argsError}</p>}
        {!argsLoading && args.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            No {side} arguments yet. Be the first to argue for this side.
          </div>
        )}
        {args.map((arg) => (
          <DebateArgumentCard key={arg._id} argument={arg} />
        ))}
        {!argsLoading && args.length < total && (
          <button
            type="button"
            onClick={() => loadPage(page + 1, side, true)}
            className="w-full py-2 text-sm font-semibold text-accent hover:bg-accent/5 rounded-xl border border-dashed border-accent/30"
          >
            Load more ({total - args.length} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

export default function DebateSection({ postId, contentType, initialArgumentId }: DebateSectionProps) {
  const { user } = useAuth();
  const [debates, setDebates] = useState<Debate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getDebatesByContent(postId);
      setDebates(list);
      const openIndex = list.findIndex((d) => d.status === 'OPEN');
      setActiveIndex(openIndex !== -1 ? openIndex : 0);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      refresh();
    }, 0);
    track({ event: 'debate_opened', properties: { contentId: postId, contentType } });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Deep-link: scroll to a specific argument/rebuttal after the list loads.
  useEffect(() => {
    if (!initialArgumentId) return;
    const t = setTimeout(() => {
      document.getElementById(`argument-${initialArgumentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    return () => clearTimeout(t);
  }, [initialArgumentId, activeIndex, debates]);

  const activeDebate = debates && debates.length > 0 ? debates[Math.min(activeIndex, debates.length - 1)] : null;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-sm py-4">{error}</p>;
  }

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Swords className="w-4 h-4 text-accent" />
        <h2 className="text-lg font-semibold">Debate</h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
          structured disagreement
        </span>
      </div>

      {debates && debates.length > 1 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
          {debates.map((d, i) => (
            <button
              key={d._id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${
                i === activeIndex ? 'bg-accent text-white border-accent' : 'border-border text-muted-foreground'
              }`}
            >
              {d.status === 'OPEN' ? '● ' : ''}
              {d.proposition.slice(0, 28)}
              {d.proposition.length > 28 ? '…' : ''}
            </button>
          ))}
        </div>
      )}

      {!activeDebate ? (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <Swords className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No debate has been started on this content yet.</p>
          {user ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-xl"
            >
              {showCreate ? 'Cancel' : 'Start a Debate'}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Login to start a debate.</p>
          )}
          {showCreate && (
            <div className="mt-4 text-left">
              <StartDebateComposer
                postId={postId}
                contentType={contentType}
                onCreated={() => {
                  setShowCreate(false);
                  refresh();
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <DebateView
          key={activeDebate._id}
          debate={activeDebate}
          currentUserId={user?._id}
          onDebateChanged={(updated) => {
            setDebates((prev) => prev?.map((d) => (d._id === updated._id ? updated : d)) ?? null);
          }}
        />
      )}
    </section>
  );
}
