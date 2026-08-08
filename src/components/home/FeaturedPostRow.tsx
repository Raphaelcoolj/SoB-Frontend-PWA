'use client';

/**
 * @file FeaturedPostRow.tsx
 * @description Compact featured post card for the "What's happening on SoB" section.
 */

import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import type { HomepagePost } from '../../types/homepage';
import { UserAvatar } from '../user/UserAvatar';
import RelativeTime from './RelativeTime';

export default function FeaturedPostRow({ post }: { post: HomepagePost }) {
  return (
    <Link
      href={`/post/${post.id}`}
      aria-label={`View post by ${post.author?.name || 'SoB'} — ${post.title || post.bodyPreview.slice(0, 60)}`}
      className="group block rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-accent/40 hover:bg-card"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {post.author && (
          <>
            <UserAvatar avatar={post.author.avatar ?? undefined} name={post.author.name} size="xs" />
            <span className="max-w-[8rem] truncate font-medium text-foreground/80">{post.author.name}</span>
            <span className="max-w-[6rem] truncate">@{post.author.username}</span>
          </>
        )}
        {post.topic && (
          <>
            <span aria-hidden="true">·</span>
            <span className="max-w-[7rem] truncate font-medium text-accent">{post.topic.name}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <RelativeTime date={post.createdAt} className="shrink-0" />
      </div>

      {post.title ? (
        <h4 className="mt-2 font-semibold leading-snug transition-colors group-hover:text-accent line-clamp-2">{post.title}</h4>
      ) : (
        <p className="mt-2 break-words text-sm text-foreground/90 line-clamp-3">{post.bodyPreview}</p>
      )}

      <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comments}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5" />
          {post.likes}
        </span>
      </div>
    </Link>
  );
}
