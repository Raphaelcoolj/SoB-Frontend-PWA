'use client';

/**
 * @file TrendingDiscussions.tsx
 * @description "Join the conversation" — real public discussions with reply counts.
 */

import React from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import type { HomepageDiscussion } from '../../types/homepage';
import SectionHeading from './SectionHeading';
import SectionMessage from './SectionMessage';
import { Skeleton } from '../ui/Skeleton';
import RelativeTime from './RelativeTime';

interface TrendingDiscussionsProps {
  discussions: HomepageDiscussion[];
  isLoading: boolean;
  hasError: boolean;
}

export default function TrendingDiscussions({ discussions, isLoading, hasError }: TrendingDiscussionsProps) {
  return (
    <section aria-labelledby="discussions-heading" className="py-10 md:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Discussions"
          title="Join the conversation"
          description="Ongoing discussions across topics on SoB."
          id="discussions-heading"
        />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : hasError ? (
          <SectionMessage message="Live discussions are temporarily unavailable." />
        ) : discussions.length === 0 ? (
          <SectionMessage message="No open discussions yet — join SoB and start one today." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {discussions.map((d) => (
              <Link
                key={d.id}
                href={`/post/${d.id}`}
                aria-label={`View discussion — ${d.title || d.bodyPreview.slice(0, 60)}`}
                className="group flex gap-4 rounded-2xl border border-border bg-card/60 p-5 transition-colors hover:border-accent/40 hover:bg-card"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <MessageCircle className="h-4 w-4" />
                  <span className="mt-0.5 text-xs font-semibold">{d.replies}</span>
                </div>
                <div className="min-w-0 flex-1">
                  {d.topic && <span className="text-xs font-medium text-accent">{d.topic.name}</span>}
                  {d.title ? (
                    <h3 className="mt-1 font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-accent">
                      {d.title}
                    </h3>
                  ) : (
                    <p className="mt-1 break-words text-sm text-foreground/90 line-clamp-2">{d.bodyPreview}</p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {d.author ? `${d.author.name} · @${d.author.username}` : 'SoB'} ·{' '}
                    <RelativeTime date={d.createdAt} />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
