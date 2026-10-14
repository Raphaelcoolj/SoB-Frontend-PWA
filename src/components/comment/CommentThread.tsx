'use client';

/**
 * @file CommentThread.tsx
 * @description Focused comment permalink view: compact post header, the
 * ancestor chain (root → direct parent) connected by a vertical thread line,
 * the highlighted focused comment, and its replies (auto-expanded).
 * Used by /post/[id]/comment/[commentId].
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { UserAvatar } from '../user/UserAvatar';
import MentionText from '../shared/MentionText';
import CommentCard from './CommentCard';
import { Skeleton } from '../ui/Skeleton';
import { formatDistanceToNow } from '../../lib/utils';
import { extractGifUrls, stripGifUrls } from '../../lib/gif';
import { Comment } from '../../types/comment';

interface PostHeader {
  _id: string;
  title?: string;
  body?: string;
  contentType: 'post' | 'article';
  author?: { name: string; username: string; avatar?: string };
}

interface CommentContext {
  comment: Comment;
  ancestors: Comment[];
  post: PostHeader | null;
}

interface CommentThreadProps {
  postId: string;
  commentId: string;
}

/** Compact read-only ancestor block in the chain above the focused comment. */
function AncestorBlock({ comment }: { comment: Comment }) {
  const textBody = stripGifUrls(comment.body);
  const gifUrls = extractGifUrls(comment.body);
  return (
    <div className="flex gap-3">
      <Link href={`/profile/${comment.author?.username}`} className="relative z-10 flex-shrink-0">
        <UserAvatar avatar={comment.author?.avatar} name={comment.author?.name} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-card/60 p-3 rounded-2xl rounded-tl-none border border-border/60">
          <div className="flex items-center justify-between mb-1">
            <Link href={`/profile/${comment.author?.username}`} className="text-xs font-semibold text-foreground hover:text-accent transition-colors">
              {comment.author?.name}
            </Link>
            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(comment.createdAt)}</span>
          </div>
          {(textBody.length > 0 || gifUrls.length === 0) && (
            <MentionText
              text={textBody.length > 0 ? textBody : comment.body}
              className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed"
            />
          )}
          {gifUrls.map((gifUrl) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={gifUrl}
              src={gifUrl}
              alt="GIF"
              className="mt-1.5 max-h-40 w-auto max-w-full rounded-lg object-contain"
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CommentThread({ postId, commentId }: CommentThreadProps) {
  const router = useRouter();
  const [data, setData] = useState<CommentContext | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comments/${commentId}/context`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load comment');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [commentId]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm font-semibold text-foreground">Comment not found</p>
        <p className="text-xs text-muted-foreground">It may have been deleted.</p>
        <Link
          href={`/post/${postId}`}
          className="mt-2 text-xs font-bold text-accent hover:underline"
        >
          Go to the post
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <Skeleton className="flex-1 h-24 rounded-2xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <Skeleton className="flex-1 h-28 rounded-2xl" />
        </div>
        <div className="flex items-center gap-2 justify-center pt-2">
          <Loader2 className="w-3 h-3 animate-spin text-accent" />
          <span className="text-[10px] text-muted-foreground">Loading thread...</span>
        </div>
      </div>
    );
  }

  const { comment, ancestors, post } = data;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-sm font-semibold text-foreground">Comment</h1>
      </div>

      <div className="p-4 space-y-3">
        {/* Compact post header — tap through to the post */}
        {post && (
          <Link
            href={`/post/${postId}`}
            className="flex gap-3 items-center p-3 rounded-2xl border border-border bg-card hover:border-accent/40 transition-colors"
            data-testid="thread-post-header"
          >
            {post.author && (
              <UserAvatar avatar={post.author.avatar} name={post.author.name} size="sm" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wide flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {post.contentType === 'article' ? 'Article' : 'Post'} · {post.author?.name}
              </p>
              <p className="text-xs text-foreground/80 truncate mt-0.5">
                {post.title || post.body?.slice(0, 100) || 'View post'}
              </p>
            </div>
          </Link>
        )}

        {/* Ancestor chain + focused comment, connected by a thread line */}
        <div className="relative">
          {/* Vertical thread line in the left gutter, spanning the whole chain */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" aria-hidden />

          <div className="relative space-y-3 pl-8">
            {ancestors.map((ancestor) => (
              <div key={ancestor._id} className="relative">
                {/* Horizontal connector: gutter line → this block */}
                <div className="absolute -left-5 top-6 w-5 h-px bg-border" aria-hidden />
                <AncestorBlock comment={ancestor} />
              </div>
            ))}

            {/* Focused comment */}
            <div className="relative">
              <div className="absolute -left-5 top-6 w-5 h-px bg-border" aria-hidden />
              <CommentCard
                comment={comment}
                postId={postId}
                highlight
                initialShowReplies
              />
            </div>
          </div>
        </div>

        {/* Back to full post */}
        <Link
          href={`/post/${postId}`}
          className="block text-center text-[11px] font-bold text-accent hover:underline pt-2 pb-6"
        >
          View all comments on the post
        </Link>
      </div>
    </div>
  );
}
