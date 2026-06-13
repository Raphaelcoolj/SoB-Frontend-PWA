'use client';

/**
 * @file PostFeed.tsx
 * @description A reusable feed component that handles infinite scroll, 
 * different post types (Article vs Post), and loading/empty states.
 */

import React, { useEffect, useRef } from 'react';
import PostCard from './PostCard';
import ArticleCard from './ArticleCard';
import { Post } from '../../types/post';
import { Skeleton } from '../ui/Skeleton';

interface PostFeedProps {
  posts: Post[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isEmpty: boolean;
  loadMore: () => void;
  onCommentClick?: (postId: string) => void;
}

function PostSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-36 w-full rounded-lg" />
    </div>
  );
}

export default function PostFeed({
  posts,
  isLoadingInitial,
  isLoadingMore,
  hasMore,
  isEmpty,
  loadMore,
  onCommentClick
}: PostFeedProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoadingInitial || isLoadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingInitial, isLoadingMore, loadMore]);

  if (isLoadingInitial) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">📚</div>
        <h3 className="font-medium text-foreground">Nothing here yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your feed is empty. Follow people or explore different fields to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        if (post.contentType === 'article') {
          return <ArticleCard key={post._id} article={post} onCommentClick={onCommentClick} />;
        }
        return <PostCard key={post._id} post={post} onCommentClick={onCommentClick} />;
      })}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-10" />

      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
{/* 
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground py-10">
          You've reached the end ✨
        </p>
      )} */}
    </div>
  );
}

