'use client';

/**
 * @file DebateThread.tsx
 * @description A specialized comment thread for 'debate' type comments.
 * Features a more intense visual style to distinguish from regular comments.
 */

import React from 'react';
import { Flame, MessageCircle } from 'lucide-react';
import CommentCard from './CommentCard';

interface DebateThreadProps {
  comments: any[];
  postId: string;
  onReply?: (id: string, username: string) => void;
  onDelete?: (id: string) => void;
}

export default function DebateThread({ comments, postId, onReply, onDelete }: DebateThreadProps) {
  const debateComments = comments.filter(c => c.type === 'debate');

  if (debateComments.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t-2 border-orange-500/20">
      <div className="flex items-center gap-2 px-1">
        <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-500">Active Debates</h3>
        <span className="text-[10px] font-medium bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">
          {debateComments.length}
        </span>
      </div>

      <div className="space-y-6">
        {debateComments.map((comment) => (
          <div key={comment._id} className="relative pl-4 border-l-2 border-orange-500/30">
            <CommentCard 
              comment={comment} 
              postId={postId} 
              onReply={onReply}
              onDelete={onDelete}
            />
            {comment.replies?.length > 0 && (
              <div className="mt-4 space-y-4">
                {comment.replies.map((reply: any) => (
                  <CommentCard 
                    key={reply._id} 
                    comment={reply} 
                    postId={postId} 
                    onReply={onReply}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

