'use client';

/**
 * @file ArticleCard.tsx
 * @description Specialized card for Article content type.
 * Articles feature a prominent title, rich text preview, and potentially different media layout.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, BookOpen, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { Post } from '../../types/post';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import UserAvatar from '../user/UserAvatar';
import FieldBadge from '../shared/FieldBadge';
import VideoPlayer from './VideoPlayer';
import { Field } from '../../types/user';
import { formatDistanceToNow } from '../../lib/utils';

interface ArticleCardProps {
  article: Post;
  onCommentClick?: (articleId: string) => void;
}

export default function ArticleCard({ article, onCommentClick }: ArticleCardProps) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const userId = user?._id || '';
  const isAuthor = article.author._id === userId;
  const [likeCount, setLikeCount] = useState(article.likes.length);
  const [isLiked, setIsLiked] = useState(article.likes.includes(userId));
  const [isBookmarked, setIsBookmarked] = useState(article.bookmarks.includes(userId));
  const [commentCount, setCommentCount] = useState(article.comments.length);
  const [showOptions, setShowOptions] = useState(false);

  const handleDelete = async () => {
    if (!accessToken || !isAuthor) return;
    try {
      const res = await fetchWithAuth(`/api/posts/${article._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // silent
    }
  };

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick(article._id);
      return;
    }
    router.push(`/post/${article._id}`);
  };

  const handleLike = async () => {
    if (!accessToken) return;
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetchWithAuth(`/api/posts/${article._id}/like`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setIsLiked((prev) => !prev);
        setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
      }
    } catch {
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleBookmark = async () => {
    if (!accessToken) return;
    setIsBookmarked((prev) => !prev);
    try {
      await fetchWithAuth(`/api/posts/${article._id}/bookmark`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch {
      setIsBookmarked((prev) => !prev);
    }
  };

  const field = article.field as Field;

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 group shadow-sm hover:shadow-md">
      {/* Cover Image or Video */}
      {article.mediaUrls.length > 0 && !article.muxPlaybackId && (
        <div className="relative h-48 sm:h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.mediaUrls[0]}
            alt={article.title || 'Article cover'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-4 right-4">
            <FieldBadge field={field} />
          </div>
        </div>
      )}

      {article.muxPlaybackId && (
        <div className="px-4 pt-4">
          <VideoPlayer playbackId={article.muxPlaybackId} />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header - Title and Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-medium text-accent uppercase tracking-widest">
            {article.isSensitive && (
              <span className="text-red-600 dark:text-red-400 font-bold border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded-full shadow-sm transition-all duration-200">
                Sensitive
              </span>
            )}
            <FieldBadge field={field} />
          </div>
          <Link href={`/post/${article._id}`}>
            <h2 className="text-xl font-semibold text-foreground leading-tight group-hover:text-accent transition-colors">
              {article.title || 'Untitled Article'}
            </h2>
          </Link>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {article.body}
        </p>

        {/* Author Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${article.author.username}`} className="flex items-center gap-2.5 group/author">
              <UserAvatar avatar={article.author.avatar} name={article.author.name} size="sm" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground group-hover/author:text-accent transition-colors">
                  {article.author.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(article.createdAt)}
                </span>
              </div>
            </Link>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showOptions && (
                  <div className="absolute left-0 bottom-full mb-1 bg-background border border-border rounded-lg shadow-lg z-10 p-1 min-w-[120px]">
                    <Link
                      href={`/post/${article._id}/edit`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md w-full transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 p-2 rounded-lg transition-colors hover:bg-muted ${
                isLiked ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
              <span className="text-xs font-medium">{likeCount}</span>
            </button>
            <button
              onClick={handleCommentClick}
              className="flex items-center gap-1 p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{commentCount}</span>
            </button>
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-lg transition-colors hover:bg-muted ${
                isBookmarked ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

