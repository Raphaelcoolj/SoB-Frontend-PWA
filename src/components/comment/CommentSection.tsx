'use client';

/**
 * @file CommentSection.tsx
 * @description Manages the comment list for a post.
 * Handles fetching comments, posting new ones, and showing replies.
 */

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Send, X, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import CommentCard from './CommentCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';

interface CommentSectionProps {
  postId: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function CommentSection({ postId }: CommentSectionProps) {
  const { user, accessToken } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const { data: commentsData, mutate, error, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/comments/post/${postId}`,
    fetcher
  );

  const comments = commentsData?.comments || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/comments', {
        post: postId,
        body: commentText,
        parentComment: replyTo?.id,
        type: 'comment'
      }, accessToken);

      if (res.ok) {
        setCommentText('');
        setReplyTo(null);
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
      const res = await api.delete(`/api/comments/${commentId}`, accessToken);
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
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent" />
          Comments
        </h3>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {comments?.length || 0}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-10 w-full rounded-2xl" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center py-10 text-xs text-destructive">Failed to load comments.</p>
        ) : comments?.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-sm font-medium text-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">Be the first to start the conversation!</p>
          </div>
        ) : (
          Array.isArray(comments) && comments.map((comment: any) => (
            <div key={comment._id} className="space-y-4">
              <CommentCard 
                comment={comment} 
                postId={postId} 
                onReply={handleReply}
                onDelete={handleDelete}
              />
              {/* Nested replies could be rendered here if backend supports populated replies */}
              {comment.replies?.length > 0 && (
                <div className="ml-10 space-y-4 border-l-2 border-muted pl-4">
                  {comment.replies.map((reply: any) => (
                    <CommentCard 
                      key={reply._id} 
                      comment={reply} 
                      postId={postId} 
                      onReply={handleReply}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border bg-card">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-[10px] font-medium text-accent">Replying to @{replyTo.username}</p>
            <button onClick={() => setReplyTo(null)} className="text-accent">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder={accessToken ? "Add a comment..." : "Login to comment"}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={!accessToken || isSubmitting}
            className="h-10 text-xs rounded-xl"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!accessToken || isSubmitting || !commentText.trim()}
            className="rounded-xl h-10 w-10 p-0 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

