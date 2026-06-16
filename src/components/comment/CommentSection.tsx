'use client';

/**
 * @file CommentSection.tsx
 * @description Manages the comment list for a post with infinite loading.
 */

import React, { useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Send, X, MessageCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'sonner';
import CommentCard from './CommentCard';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Comment } from '../../types/comment';

interface CommentSectionProps {
  postId: string;
  contentType?: 'post' | 'article';
}

const PAGE_SIZE = 10;

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function CommentSection({ postId, contentType }: CommentSectionProps) {
  const { user, accessToken } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [commentType, setCommentType] = useState<'comment' | 'debate'>('comment');

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.comments.length) return null;
    return `${process.env.NEXT_PUBLIC_API_URL}/api/comments/post/${postId}?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
  };

  const { data, mutate, error, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher);

  const comments: Comment[] = data ? data.map(page => page.comments).flat() : [];
  const isLoadingInitialData = !data && !error;
  const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.comments?.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.comments?.length < PAGE_SIZE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          post: postId,
          body: commentText,
          parentComment: replyTo?.id,
          type: commentType
        })
      });

      if (res.ok) {
        setCommentText('');
        setReplyTo(null);
        setCommentType('comment');
        mutate(); // Refresh comments
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetchWithAuth(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleReply = (id: string, username: string) => {
    setReplyTo({ id, username });
    // Focus input? 
    const textarea = document.getElementById('comment-textarea');
    if (textarea) textarea.focus();
  };

  return (
    <div className="flex flex-col h-full max-h-[75vh]">
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent" />
          Comments
        </h3>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {data?.[0]?.pagination?.total || 0}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {isLoadingInitialData ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center py-10 text-xs text-destructive">Failed to load comments.</p>
        ) : isEmpty ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-sm font-semibold text-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">Be the first to start the conversation!</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {comments.map((comment: Comment) => (
                <CommentCard 
                  key={comment._id} 
                  comment={comment} 
                  postId={postId} 
                  onReply={handleReply}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {!isReachingEnd && (
              <button
                disabled={isLoadingMore || isValidating}
                onClick={() => setSize(size + 1)}
                className="w-full py-3 text-xs font-bold text-accent hover:bg-accent/5 rounded-xl transition-colors border border-dashed border-accent/20 mt-4"
              >
                {isLoadingMore || isValidating ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading more...
                  </div>
                ) : (
                  'Load more comments'
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Comment Form */}
      <div className="p-4 border-t border-border bg-card">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-accent/5 border border-accent/10 rounded-xl">
            <p className="text-[10px] font-bold text-accent">Replying to @{replyTo.username}</p>
            <button onClick={() => setReplyTo(null)} className="text-accent hover:bg-accent/10 p-1 rounded-full">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {contentType === 'article' && !replyTo && (
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setCommentType('comment')}
                className={`text-[10px] px-4 py-1.5 rounded-full font-bold transition-all ${commentType === 'comment' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                Comment
              </button>
              <button 
                type="button"
                onClick={() => setCommentType('debate')}
                className={`text-[10px] px-4 py-1.5 rounded-full font-bold transition-all ${commentType === 'debate' ? 'bg-accent text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                Debate
              </button>
            </div>
          )}
          <div className="flex gap-2 items-start">
            <textarea
              id="comment-textarea"
              placeholder={accessToken ? (commentType === 'debate' ? "Start a debate..." : "Add a comment...") : "Login to comment"}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!accessToken || isSubmitting}
              className="w-full h-20 p-4 text-sm rounded-2xl border border-border bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent focus:outline-none transition-all resize-none"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!accessToken || isSubmitting || !commentText.trim()}
              className="rounded-2xl h-20 w-12 p-0 flex-shrink-0 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
