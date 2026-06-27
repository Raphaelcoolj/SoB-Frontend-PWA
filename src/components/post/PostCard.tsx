'use client';

/**
 * @file PostCard.tsx
 * @description Renders a single post in the feed.
 * Shows author info, field badge, content, media, and engagement actions (like, comment, share, bookmark).
 * Supports real-time like/comment count updates via socket events from parent.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, MoreHorizontal, Trash2, Edit, Flag } from 'lucide-react';
import ImageLightbox from './ImageLightbox';
import ReportModal from './ReportModal';
import { toast } from 'sonner';
import { Post } from '../../types/post';
import { useAuthStore } from '../../store/authStore';
import { fetchWithAuth } from '../../lib/api';
import { UserAvatar } from '../user/UserAvatar';
import VideoPlayer from './VideoPlayer';
import { formatDistanceToNow } from '../../lib/utils';

interface PostCardProps {
  post: Post;
  onCommentClick?: (postId: string) => void;
  fullView?: boolean;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, onCommentClick, fullView = false, onDelete }: PostCardProps) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const userId = user?._id || '';
  const isAuthor = post.author._id === userId;
  const [likeCount, setLikeCount] = useState((post.likes || []).length);
  const [isLiked, setIsLiked] = useState((post.likes || []).includes(userId));
  const [isBookmarked, setIsBookmarked] = useState((post.bookmarks || []).includes(userId));
  const [commentCount, setCommentCount] = useState((post.comments || []).length);
  const [showOptions, setShowOptions] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick(post._id);
      return;
    }

    if (!fullView) {
      router.push(`/post/${post._id}`);
    }
  };

  const handleLike = async () => {
    if (!accessToken) return;
    // Optimistic update
    setIsLiked((prev) => !prev);
    setLikeCount((prev: number) => (isLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetchWithAuth(`/api/posts/${post._id}/like`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        // Revert
        setIsLiked((prev) => !prev);
        setLikeCount((prev: number) => (isLiked ? prev + 1 : prev - 1));
      }
    } catch {
      setIsLiked((prev) => !prev);
      setLikeCount((prev: number) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleBookmark = async () => {
    if (!accessToken) return;
    setIsBookmarked((prev) => !prev);
    try {
      await fetchWithAuth(`/api/posts/${post._id}/bookmark`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch {
      setIsBookmarked((prev) => !prev);
    }
  };

  const handleShare = async () => {
    // FIXED: Use correct post URL for sharing
    const shareUrl = `${window.location.origin}/post/${post._id}`;

    try {
      await fetchWithAuth(`/api/posts/${post._id}/share`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (navigator.share) {
        navigator.share({ 
          title: post.contentType === 'article' ? post.title : `${post.author.name} on SoB`, 
          text: post.body?.slice(0, 100),
          url: shareUrl 
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !isAuthor) return;
    try {
      const res = await fetchWithAuth(`/api/posts/${post._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete?.(post._id);
      }
    } catch {
      // silent
    }
  };

  const isArticle = post.contentType === 'article';

  // DEBUG: Inspect the post object to see why _id is undefined
  console.log('[PostCard] Inspecting post object:', post);

  return (
    <article className="bg-card border border-border rounded-xl overflow-hidden transition-colors duration-200 group">
      {/* Author header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={`/profile/${post.author.username}`} className="flex-shrink-0">
          <UserAvatar avatar={post.author.avatar} name={post.author.name} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <Link
                href={`/profile/${post.author.username}`}
                className="font-medium text-sm text-foreground hover:text-accent transition-colors truncate"
              >
                {post.author.name}
              </Link>
              <span className="text-muted-foreground text-[11px] leading-none">@{post.author.username}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="text-muted-foreground text-xs flex-shrink-0">{formatDistanceToNow(post.createdAt)}</span>
              <div className="relative">
                <button onClick={() => setShowOptions(!showOptions)} className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showOptions && (
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 p-1 min-w-[120px]">
                    {isAuthor ? (
                      <>
                        <Link
                          href={`/post/${post._id}/edit`}
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
                      </>
                    ) : (
                      <button
                        onClick={() => { setShowOptions(false); setShowReportModal(true); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-md w-full"
                      >
                        <Flag className="w-4 h-4" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {post.isSensitive && (
            <div className="mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 border border-red-500/20 bg-red-500/10 rounded-full px-2 py-0.5 shadow-sm transition-all duration-200">
                Sensitive
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
        </div>
      </div>

      {/* Content body */}
      <Link href={`/post/${post._id}`} className="block px-4 pb-3">
        {isArticle && post.title && (
          <h2 className={`font-semibold text-foreground mb-1.5 leading-snug hover:text-accent transition-colors ${fullView ? 'text-2xl' : 'text-base'}`}>
            {post.title}
          </h2>
        )}
        {fullView ? (
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: post.body?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') }} />
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-4">
            {post.body?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}
          </p>
        )}
      </Link>

      {/* Media (images or HLS video) */}
      {post.muxPlaybackId && (
        <div className="px-4 pb-3">
          <VideoPlayer playbackId={post.muxPlaybackId} />
        </div>
      )}

      {!post.muxPlaybackId && post.mediaUrls.length > 0 && (
        <div className={`px-4 pb-3 grid gap-1.5 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.mediaUrls.slice(0, 4).map((url, i) => (
            // NEW: Wrap image in clickable button to trigger full screen lightbox
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering post navigation
                setLightboxIndex(i);
                setLightboxOpen(true);
              }}
              className="w-full h-48 relative overflow-hidden rounded-lg border border-border cursor-pointer focus:outline-none hover:opacity-95 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Media ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center gap-1 px-4 py-3 border-t border-border/60">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:bg-muted active:scale-95 cursor-pointer ${
            isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
          <span className="text-xs font-medium">{likeCount}</span>
        </button>

        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{commentCount}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-medium">{post.shares}</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={handleBookmark}
          className={`p-1.5 rounded-lg transition-all duration-150 hover:bg-muted active:scale-95 cursor-pointer ${
            isBookmarked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={post.mediaUrls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      {showReportModal && (
        <ReportModal postId={post._id} onClose={() => setShowReportModal(false)} />
      )}
    </article>
  );
}
