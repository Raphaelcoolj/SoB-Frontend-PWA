'use client';

/**
 * @file ProductPreview.tsx
 * @description Above-the-fold live product preview: a real SoB post rendered
 * in native SoB card styling (author, topic badge, body, media, engagement).
 */

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Heart, MessageCircle, Share2 } from 'lucide-react';
import type { HomepagePost } from '../../types/homepage';
import { UserAvatar } from '../user/UserAvatar';
import FeedImage from '../post/FeedImage';
import { Skeleton } from '../ui/Skeleton';
import RelativeTime from './RelativeTime';

interface ProductPreviewProps {
  post: HomepagePost | null;
  isLoading: boolean;
  hasError: boolean;
}

export default function ProductPreview({ post, isLoading, hasError }: ProductPreviewProps) {
  if (isLoading) {
    return (
      <section aria-label="Live product preview" className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-2 h-4 w-3/5" />
            <div className="mt-5 flex items-center gap-6">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section aria-label="Live product preview" className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-10 text-center text-sm text-muted-foreground">
            Live SoB posts are temporarily unavailable. Please try again shortly.
          </p>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section aria-label="Live product preview" className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">Live from SoB</p>
          <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No public posts yet. Be the first to share an idea on SoB.
            </p>
            <Link
              href="/register"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              Join SoB
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Live product preview" className="py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">Live from SoB</p>
        <Link
          href={`/post/${post.id}`}
          aria-label={`View post by ${post.author?.name || 'SoB'} — ${post.title || post.bodyPreview.slice(0, 60)}`}
          className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:bg-card/80 hover:border-accent/40"
        >
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              {post.author ? (
                <UserAvatar avatar={post.author.avatar ?? undefined} name={post.author.name} size="md" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{post.author?.name || 'SoB'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{post.author?.username || 'sob'} · <RelativeTime date={post.createdAt} />
                </p>
              </div>
              {post.topic && (
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  {post.topic.name}
                </span>
              )}
            </div>

            {post.title && <h3 className="mt-4 text-lg font-semibold leading-snug">{post.title}</h3>}
            {post.bodyPreview && (
              <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground/90 line-clamp-6">
                {post.bodyPreview}
              </p>
            )}
          </div>

          {post.hasMedia && post.mediaUrl && (
            <FeedImage
              src={post.mediaUrl}
              alt={post.title ?? 'Post media'}
              className="h-44 w-full sm:h-56"
            />
          )}

          <div className="flex items-center gap-6 px-5 pb-4 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {post.comments}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              {post.likes}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Share2 className="h-4 w-4" />
              {post.shares}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-accent group-hover:underline">
              View post
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
