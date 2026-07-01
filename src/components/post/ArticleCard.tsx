'use client';

/**
 * @file ArticleCard.tsx
 * @description Specialized card for Article content type.
 * Articles feature a prominent title, rich text preview, and potentially different media layout.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, BookOpen, MoreHorizontal, Trash2, Edit } from 'lucide-react';
// NEW: Import ImageLightbox
import ImageLightbox from './ImageLightbox';
import { Post } from '../../types/post';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { socket } from '../../lib/socket';
import UserAvatar from '../user/UserAvatar';
import VideoPlayer from './VideoPlayer';
import { formatDistanceToNow } from '../../lib/utils';
import { toast } from 'sonner';

interface ArticleCardProps {
  article: Post;
  onCommentClick?: (articleId: string) => void;
  variant?: 'default' | 'flat';
}

export default function ArticleCard({ article, onCommentClick, variant = 'default' }: ArticleCardProps) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const userId = user?._id || '';
  const isAuthor = article.author._id === userId;
  const [likeCount, setLikeCount] = useState(article.likes.length);
  const [isLiked, setIsLiked] = useState(article.likes.includes(userId));
  const [isBookmarked, setIsBookmarked] = useState(article.bookmarks.includes(userId));
  const [commentCount, setCommentCount] = useState(article.comments.length);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setCommentCount(article.comments.length);
  }, [article.comments]);

  useEffect(() => {
    if (!socket.connected) return;
    const handleNewComment = () => setCommentCount((c) => c + 1);
    socket.on('new_comment', handleNewComment);
    socket.on('new_debate', handleNewComment);
    return () => {
      socket.off('new_comment', handleNewComment);
      socket.off('new_debate', handleNewComment);
    };
  }, []);

  // NEW: State for image lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${article._id}`;
    try {
      await fetchWithAuth(`/api/posts/${article._id}/share`, { method: 'POST', body: JSON.stringify({}) });
      if (navigator.share) {
        navigator.share({ title: article.title || 'Check this out', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard');
      }
    } catch { /* silent */ }
  };

  if (variant === 'flat') {
    return (
      <article className="border-b border-border/40 py-4 px-4 transition-colors duration-200 group bg-transparent [backface-visibility:hidden]">
        <div className="flex gap-3">
          {/* Avatar on the left */}
          <Link href={`/profile/${article.author.username}`} className="flex-shrink-0">
            <UserAvatar avatar={article.author.avatar} name={article.author.name} size="md" />
          </Link>
          
          <div className="flex-1 min-w-0">
            {/* Header: Name @username · time and more options */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                <Link
                  href={`/profile/${article.author.username}`}
                  className="font-bold text-sm text-foreground hover:underline truncate flex-shrink-0 max-w-[120px] sm:max-w-[200px]"
                >
                  {article.author.name}
                </Link>
                <span className="text-muted-foreground text-xs truncate min-w-0 flex-1">@{article.author.username}</span>
                <span className="text-muted-foreground text-xs flex-shrink-0">·</span>
                <span className="text-muted-foreground text-xs flex-shrink-0">{formatDistanceToNow(article.createdAt)}</span>
              </div>
              
              <div className="relative font-normal">
                <button onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }} className="text-muted-foreground hover:text-foreground p-1 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showOptions && (
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 p-1 min-w-[120px]">
                    {isAuthor ? (
                      <>
                        <Link
                          href={`/post/${article._id}/edit`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md w-full transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md w-full cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="block px-3 py-2 text-xs text-muted-foreground">Options</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Nested Article Card block (on the right) */}
            <div className="mt-2 border border-border rounded-2xl overflow-hidden bg-card hover:bg-muted transition-colors duration-200 cursor-pointer">
              <Link href={`/post/${article._id}`} className="block">
                {/* Cover image if available */}
                {article.mediaUrls.length > 0 && (
                  <div className="relative w-full h-40 overflow-hidden border-b border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.mediaUrls[0]}
                      alt={article.title || 'Article cover'}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    />
                  </div>
                )}
                
                {/* Text section inside article preview card */}
                <div className="p-4 space-y-1.5">
                  <h2 className="text-base font-bold text-foreground leading-snug group-hover:text-accent transition-colors line-clamp-2">
                    {article.title || 'Untitled Article'}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-normal line-clamp-2">
                    {article.body?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}
                  </p>
                </div>
              </Link>
            </div>

            {/* Engagement Row - Twitter style */}
            <div className="flex items-center justify-between mt-3 max-w-md text-muted-foreground pr-4">
              <button
                onClick={handleCommentClick}
              className="flex items-center gap-1.5 p-1.5 rounded-full hover:text-accent hover:bg-muted transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{commentCount}</span>
              </button>

              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 p-1.5 rounded-full hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer ${isLiked ? 'text-red-500' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                <span className="text-xs">{likeCount}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 p-1.5 rounded-full hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleBookmark}
              className={`p-1.5 rounded-full hover:text-accent hover:bg-muted transition-colors cursor-pointer ${isBookmarked ? 'text-accent' : ''}`}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {lightboxOpen && (
          <ImageLightbox
            images={article.mediaUrls}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </article>
    );
  }

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 group shadow-sm hover:shadow-md">
      {/* Cover Image or Video */}
      {article.mediaUrls.length > 0 && !article.muxPlaybackId && (
        // NEW: Wrap article cover image in a button to open image lightbox on tap
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent triggering article/post detail navigation
            setLightboxIndex(0);
            setLightboxOpen(true);
          }}
          className="relative w-full h-48 sm:h-64 overflow-hidden block focus:outline-none cursor-pointer text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.mediaUrls[0]}
            alt={article.title || 'Article cover'}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
          </div>
        </button>
      )}

      {article.muxPlaybackId && (
        <div className="px-4 pt-4">
          <VideoPlayer playbackId={article.muxPlaybackId} />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header - Title and Type */}
        <div className="space-y-2">
          {article.isSensitive && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded-full shadow-sm transition-all duration-200 inline-flex w-fit">
              Sensitive
            </span>
          )}
          <Link href={`/post/${article._id}`}>
            <h2 className="text-xl font-semibold text-foreground leading-tight group-hover:text-accent transition-colors">
              {article.title || 'Untitled Article'}
            </h2>
          </Link>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {article.body?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}
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
              onClick={handleCommentClick}
              className="flex items-center gap-1 p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{commentCount}</span>
            </button>
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
              onClick={handleShare}
              className="flex items-center gap-1 p-2 rounded-lg transition-colors hover:bg-muted text-muted-foreground"
            >
              <Share2 className="w-4 h-4" />
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

      {/* NEW: Conditional lightbox overlay */}
      {lightboxOpen && (
        <ImageLightbox
          images={article.mediaUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}

