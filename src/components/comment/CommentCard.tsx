'use client';

/**
 * @file CommentCard.tsx
 * @description Renders a single comment or reply.
 * Supports liking, replying, and editing (if own).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Reply, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { UserAvatar } from '../user/UserAvatar';
import { fetchWithAuth } from '../../lib/api';
import { formatDistanceToNow } from '../../lib/utils';

interface CommentCardProps {
  comment: any; // TODO: Add Comment type
  postId: string;
  onReply?: (commentId: string, username: string) => void;
  onDelete?: (commentId: string) => void;
}

export default function CommentCard({ comment, postId, onReply, onDelete }: CommentCardProps) {
  const { user, accessToken } = useAuthStore();
  const [isLiked, setIsLiked] = useState(comment.likes?.includes(user?._id));
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [showActions, setShowActions] = useState(false);

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

  return (
    <div className="flex gap-3 group relative">
      {/* Thread line */}
      <div className="absolute left-5 top-10 bottom-[-24px] w-px bg-border group-last:hidden" />
      
      <Link href={`/profile/${comment.author?.username}`} className="relative z-10">
        <UserAvatar avatar={comment.author?.avatar} name={comment.author?.name} size="sm" />
      </Link>
      <div className="flex-1 space-y-1.5 pb-4">
        <div className="bg-card p-3 rounded-2xl rounded-tl-none border border-border">
          <div className="flex items-center justify-between mb-1">
            <Link href={`/profile/${comment.author?.username}`} className="text-xs font-medium text-foreground hover:underline">
              {comment.author?.name}
            </Link>
            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {comment.body}
          </p>
        </div>

        <div className="flex items-center gap-4 pl-1">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Heart className={`w-3 h-3 ${isLiked ? 'fill-red-500' : ''}`} />
            <span>{likeCount}</span>
          </button>
          
          <button 
            onClick={() => onReply?.(comment._id, comment.author?.username)}
            className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Reply className="w-3 h-3" />
            <span>Reply</span>
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
                <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10 w-24">
                  <button 
                    onClick={() => { onDelete?.(comment._id); setShowActions(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
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
  );
}
