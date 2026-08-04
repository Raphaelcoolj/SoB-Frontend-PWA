'use client';

/**
 * @file PollBlock.tsx
 * @description Interactive poll with horizontal progress bars and single/multiple voting.
 * Shows vote counts after the current user votes; otherwise hides counts until they participate.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Check, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Poll, PollOption } from '../../types/post';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { cn } from '../../lib/utils';

interface PollBlockProps {
  poll: Poll;
  postId: string;
}

interface VoteView {
  counts: number[];
  myVotes: boolean[];
  totalVoters: number;
  hasVoted: boolean;
}

const computeView = (options: PollOption[], userId: string): VoteView => {
  const counts = options.map((o) => o.votes?.length || 0);
  const myVotes = options.map((o) => o.votes?.some((v) => v === userId) || false);
  const voterSet = new Set<string>();
  options.forEach((o) => (o.votes || []).forEach((v) => voterSet.add(v)));
  return {
    counts,
    myVotes,
    totalVoters: voterSet.size,
    hasVoted: myVotes.some(Boolean),
  };
};

export default function PollBlock({ poll, postId }: PollBlockProps) {
  const { user } = useAuthStore();
  const userId = user?._id || '';

  const options = poll.options || [];
  const allowMultiple = !!poll.allowMultiple;

  const initial = useMemo(() => computeView(options, userId), [options, userId]);
  const [view, setView] = useState<VoteView>(initial);
  const [voting, setVoting] = useState(false);

  const total = view.counts.reduce((a, b) => a + b, 0) || view.totalVoters;
  const hasVoted = view.hasVoted || view.myVotes.some(Boolean);

  const applyServerPoll = useCallback((serverPoll: any) => {
    if (!serverPoll?.options) return;
    const nextCounts = serverPoll.options.map((o: any) => o.count || 0);
    const nextMyVotes = serverPoll.options.map((o: any) => !!o.voted);
    const nextTotal = serverPoll.totalVoters || 0;
    setView({
      counts: nextCounts,
      myVotes: nextMyVotes,
      totalVoters: nextTotal,
      hasVoted: nextMyVotes.some(Boolean),
    });
  }, []);

  const handleVote = async (index: number) => {
    if (!userId) {
      toast.error('Sign in to vote');
      return;
    }
    if (voting) return;

    const nextMyVotes = [...view.myVotes];
    if (allowMultiple) {
      nextMyVotes[index] = !nextMyVotes[index];
    } else {
      const wasVoted = nextMyVotes[index];
      nextMyVotes.fill(false);
      if (!wasVoted) nextMyVotes[index] = true;
    }

    const delta = nextMyVotes.reduce((a, b, i) => a + (b ? 1 : 0) - (view.myVotes[i] ? 1 : 0), 0);
    const optimistic = {
      ...view,
      counts: view.counts.map((c, i) => c + (nextMyVotes[i] ? 1 : 0) - (view.myVotes[i] ? 1 : 0)),
      myVotes: nextMyVotes,
      totalVoters: view.totalVoters + (delta === 0 && view.hasVoted ? 0 : delta > 0 ? 1 : -1),
      hasVoted: nextMyVotes.some(Boolean),
    };
    setView(optimistic);

    const optionIndexes = nextMyVotes.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    try {
      const res = await fetchWithAuth(`/api/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIndexes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to record vote');
      }
      const data = await res.json();
      applyServerPoll(data.data?.poll);
    } catch (err: any) {
      toast.error(err.message || 'Could not record your vote');
      setView(initial);
    }
  };

  const pct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-4 h-4 text-accent flex-shrink-0" />
          <h3 className="text-sm font-semibold text-foreground truncate">{poll.question}</h3>
        </div>
        {hasVoted && (
          <span className="text-[11px] text-muted-foreground flex-shrink-0">
            {total} vote{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-2">
        {options.map((opt, i) => {
          const count = view.counts[i] || 0;
          const isMine = view.myVotes[i];
          const percent = pct(count);
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voting}
              className={cn(
                'w-full text-left relative rounded-lg border px-3 py-2 transition-colors cursor-pointer disabled:cursor-default',
                isMine
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-background hover:border-accent/50'
              )}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-lg bg-accent/15 transition-all duration-300"
                style={{ width: hasVoted ? `${percent}%` : '0%' }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="text-sm text-foreground flex items-center gap-2 min-w-0">
                  <span className="truncate">{opt.text}</span>
                  {isMine && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                </span>
                {hasVoted && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {count} · {percent}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{allowMultiple ? 'Multiple choices' : 'Single choice'}</span>
        {hasVoted ? (
          <span>Tap an option to change your vote</span>
        ) : (
          <span>Vote to see results</span>
        )}
      </div>
    </div>
  );
}
