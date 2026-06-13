'use client';

/**
 * @file page.tsx (home)
 * @description For You Feed (FYF) page — the main content feed.
 * Features infinite scroll, feed type tabs (All/Articles/Posts),
 * skeleton loaders, empty states, and pull-to-refresh.
 */

import React, { useState, useCallback } from 'react';
import { useFeed } from '../../../hooks/useFeed';
import PostFeed from '../../../components/post/PostFeed';
import { RefreshCw } from 'lucide-react';

export default function HomePage() {
  const { posts, isLoadingInitial, isLoadingMore, hasMore, isEmpty, loadMore, refresh } = useFeed('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [refresh]);

  return (
    <div className="space-y-4 pb-20">
      {/* Refresh control - Desktop only */}
      <div className="hidden md:flex justify-end pt-2">
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 active:scale-90 cursor-pointer"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <PostFeed 
        posts={posts}
        isLoadingInitial={isLoadingInitial}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        isEmpty={isEmpty}
        loadMore={loadMore}
      />
    </div>
  );
}


