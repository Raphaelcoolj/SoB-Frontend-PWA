'use client';

/**
 * @file DebateLite.tsx
 * @description Compact debate card shown beneath short posts. Surfaces the
 * active debate's proposition, live FOR/AGAINST split, and a couple of
 * recent arguments, then drives deeper engagement with a link into the full
 * debate view on the post page (?tab=debate).
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swords, Loader2, ChevronRight } from 'lucide-react';
import { getArguments, getDebatesByContent } from '../../services/debate';
import { track } from '../../lib/analytics';
import type { Debate, DebateArgument, DebateSide } from '../../types/debate';

interface DebateLiteProps {
  postId: string;
}

const SIDE_COLORS: Record<DebateSide, string> = {
  FOR: 'text-emerald-600',
  AGAINST: 'text-red-500',
};

export default function DebateLite({ postId }: DebateLiteProps) {
  const [debate, setDebate] = useState<Debate | null>(null);
  const [previewArgs, setPreviewArgs] = useState<DebateArgument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getDebatesByContent(postId);
        if (cancelled) return;
        const active = list.find((d) => d.status === 'OPEN') ?? list[0];
        if (active) {
          setDebate(active);
          const [forRes, againstRes] = await Promise.all([
            getArguments(active._id, { side: 'FOR', page: 1, limit: 2 }),
            getArguments(active._id, { side: 'AGAINST', page: 1, limit: 2 }),
          ]);
          if (!cancelled) {
            const combined = [...forRes.arguments, ...againstRes.arguments]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 3);
            setPreviewArgs(combined);
          }
        }
        track({ event: 'debate_viewed', properties: { contentId: postId, contentType: 'post' } });
      } catch {
        // Silent — debate card is optional enrichment; the post still renders.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!debate) {
    return (
      <Link
        id="debate-lite"
        href={`/post/${postId}?tab=debate`}
        className="flex items-center justify-between border border-dashed border-accent/30 rounded-xl p-3 text-sm text-muted-foreground hover:bg-accent/5"
      >
        <span className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-accent" />
          Start or join a debate on this post
        </span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    );
  }

  const forPct = debate.stats?.forPct ?? 50;
  const againstPct = debate.stats?.againstPct ?? 50;

  return (
    <div id="debate-lite" className="border border-border rounded-xl p-4 bg-card">
      <Link href={`/post/${postId}?tab=debate`} className="block">
        <div className="flex items-center gap-2 mb-1">
          <Swords className="w-4 h-4 text-accent shrink-0" />
          <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{debate.proposition}</h4>
          <span
            className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              debate.status === 'OPEN'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {debate.status}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] font-bold text-emerald-600 shrink-0">FOR {forPct}%</span>
          <div
            className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex"
            role="img"
            aria-label={`For ${forPct}%, against ${againstPct}%`}
          >
            <div className="bg-emerald-500 h-full" style={{ width: `${forPct}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${againstPct}%` }} />
          </div>
          <span className="text-[9px] font-bold text-red-500 shrink-0">AGAINST {againstPct}%</span>
        </div>
      </Link>

      {previewArgs.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-2">
          {previewArgs.map((arg) => {
            const author = typeof arg.author === 'object' ? arg.author : null;
            return (
              <li key={arg._id} className="text-xs text-muted-foreground line-clamp-1">
                <span className={`font-bold ${SIDE_COLORS[arg.side]}`}>{arg.side}:</span>{' '}
                {arg.body.slice(0, 90)}
                {arg.body.length > 90 ? '…' : ''}
                {author ? ` — ${author.name}` : ''}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={`/post/${postId}?tab=debate`}
        className="mt-3 flex items-center justify-center gap-1 w-full py-2 text-xs font-bold text-accent border border-accent/30 rounded-lg hover:bg-accent/5"
      >
        Make an argument <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
