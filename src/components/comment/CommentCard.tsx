'use client';

/**
 * @file CommentCard.tsx
 * @description Renders a single comment or reply.
 * Supports liking, replying, and editing (if own).
 * Supports recursive rendering of replies and lazy-loading.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Reply, MoreHorizontal, Trash2, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import { UserAvatar } from '../user/UserAvatar';
import MentionText from '../shared/MentionText';
import { fetchWithAuth } from '../../lib/api';
import { formatDistanceToNow } from '../../lib/utils';
import { extractGifUrls, stripGifUrls } from '../../lib/gif';
import { Comment } from '../../types/comment';
import { Skeleton } from '../ui/Skeleton';

interface CommentCardProps {
  comment: Comment;
  postId: string;
  onReply?: (commentId: string, username: string) => void;
  onDelete?: (commentId: string) => void;
  depth?: number;
  /** Deep-linked comment — ring-tinted so it stands out after scrolling. */
  highlight?: boolean;
  /** Permalink pages open the focused comment's replies immediately. */
  initialShowReplies?: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function CommentCard({ 
  comment, 
  postId, 
  onReply, 
  onDelete,
  depth = 0,
  highlight = false,
  initialShowReplies = false
}: CommentCardProps) {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(comment.likes?.includes(user?._id || ''));
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [showActions, setShowActions] = useState(false);
  const [showReplies, setShowReplies] = useState(initialShowReplies);

  // Lazy load replies
  const { data: repliesData, isLoading: isRepliesLoading } = useSWR(
    showReplies ? `${process.env.NEXT_PUBLIC_API_URL}/api/comments/${comment._id}/replies?limit=50` : null,
    fetcher
  );

  const replies = repliesData?.replies || [];

  const handleLike = async () => {
    if (!accessToken) return;
    setIsLiked(!isLiked);
    setLikeCount((prev: number) => (isLiked ? prev - 1 : prev + 1));
    try {
      await fetchWithAuth(`/api/comments/${comment._id}/like`, { 
        method: 'POST', 
        body: JSON.stringify({}) 
      });
    } catch {
      setIsLiked(isLiked);
      setLikeCount((prev: number) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const isOwnComment = user?._id === comment.author?._id;
  const hasReplies = (comment.repliesCount || 0) > 0;
  const gifUrls = extractGifUrls(comment.body);
  const textBody = stripGifUrls(comment.body);

  const handleShare = async () => {
    // Canonical permalink — opens the focused comment thread view.
    const shareUrl = `${window.location.origin}/post/${postId}/comment/${comment._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${comment.author?.name} on SoB`,
          text: (textBody || comment.body).slice(0, 100),
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <div
      id={`comment-${comment._id}`}
      className={`flex flex-col gap-1 group relative ${depth > 0 ? 'mt-2' : ''}`}
    >
      <div className="flex gap-3 relative">
        {/* Thread line for nested comments */}
        {hasReplies && showReplies && (
          <div className="absolute left-4 top-10 bottom-0 w-px bg-border/60" />
        )}
        
        <Link href={`/profile/${comment.author?.username}`} className="relative z-10 flex-shrink-0">
          <UserAvatar avatar={comment.author?.avatar} name={comment.author?.name} size={depth > 0 ? "sm" : "md"} />
        </Link>
        
        <div className="flex-1 space-y-1.5">
          <div
            onClick={() => router.push(`/post/${postId}/comment/${comment._id}`)}
            className={`bg-card p-3 rounded-2xl rounded-tl-none border transition-colors cursor-pointer ${highlight ? 'border-accent ring-2 ring-accent/40' : 'border-border group-hover:border-border/80 hover:border-accent/40'}`}
            data-testid={`comment-bubble-${comment._id}`}
          >
            <div className="flex items-center justify-between mb-1">
              <Link
                href={`/profile/${comment.author?.username}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-foreground hover:text-accent transition-colors"
              >
                {comment.author?.name}
              </Link>
              <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(comment.createdAt)}</span>
            </div>
            {(textBody.length > 0 || gifUrls.length === 0) && (
              <MentionText
                text={textBody.length > 0 ? textBody : comment.body}
                className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed"
              />
            )}
            {gifUrls.map((gifUrl) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={gifUrl}
                src={gifUrl}
                alt="GIF"
                className="mt-1.5 max-h-60 w-auto max-w-full rounded-lg object-contain"
                loading="lazy"
                data-testid={`comment-gif-${comment._id}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-4 pl-1">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-[10px] font-bold transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-red-500' : ''}`} />
              <span>{likeCount}</span>
            </button>
            
            <button 
              onClick={() => onReply?.(comment._id, comment.author?.username)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-90"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all active:scale-90"
              data-testid={`share-comment-${comment._id}`}
              aria-label="Share comment"
            >
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>

            {isOwnComment && (
              <div className="relative">
                <button 
                  onClick={() => setShowActions(!showActions)}
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                {showActions && (
                  <div className="absolute left-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 z-20 w-28 overflow-hidden animate-in fade-in slide-in-from-top-1">
                    <button 
                      onClick={() => { onDelete?.(comment._id); setShowActions(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies section */}
      <div className={`${depth < 3 ? 'ml-10' : 'ml-4'} space-y-4`}>
        {hasReplies && !showReplies && (
          <button 
            onClick={() => setShowReplies(true)}
            className="flex items-center gap-2 text-[10px] font-bold text-accent hover:underline mt-1"
          >
            <ChevronDown className="w-3 h-3" />
            View {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {showReplies && (
          <div className="mt-2 space-y-4">
            {isRepliesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                    <Skeleton className="h-10 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {replies.map((reply: Comment) => (
                  <CommentCard 
                    key={reply._id} 
                    comment={reply} 
                    postId={postId} 
                    onReply={onReply}
                    onDelete={onDelete}
                    depth={depth + 1}
                  />
                ))}
                <button 
                  onClick={() => setShowReplies(false)}
                  className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:underline"
                >
                  <ChevronUp className="w-3 h-3" />
                  Hide replies
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
