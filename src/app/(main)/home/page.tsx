'use client';

/**
 * @file page.tsx (home)
 * @description For You / Following Feed page — the main content feed.
 * Features mobile-first sticky header, feed type tabs, clientside following filter,
 * skeleton loaders, empty states, and pull-to-refresh.
 */

import React, { useState } from 'react';
import { useFeed } from '../../../hooks/useFeed';
import { useFollowingFeed } from '../../../hooks/useFollowingFeed';
import PostFeed from '../../../components/post/PostFeed';
import Logo from '../../../components/shared/Logo';
import Link from 'next/link';
import { MoreVertical, Plus } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

export default function HomePage() {
  const { user: currentUser } = useAuthStore();
  const { posts: fyfPosts, isLoadingInitial: fyfLoading, isLoadingMore: fyfLoadingMore, hasMore: fyfHasMore, isEmpty: fyfEmpty, loadMore: fyfLoadMore } = useFeed('all');
  const { posts: followingPosts, isLoadingInitial: followingLoading, isLoadingMore: followingLoadingMore, hasMore: followingHasMore, isEmpty: followingEmpty, loadMore: followingLoadMore } = useFollowingFeed();

  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');

  return (
    <div className="space-y-4 pb-20 -mt-4 lg:-mt-6">
      {/* Sticky Home Top Header Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md will-change-transform border-b border-border/40 -mx-4 pt-2.5 pb-0">
        {/* Logo + Actions row — mobile only (sidebar shows logo on larger screens) */}
        <div className="md:hidden px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            {/* Options button → settings */}
            <Link href="/settings" className="p-2 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer">
              <MoreVertical className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Tabs for you vs following */}
        <div className="flex border-b border-border/40 mt-2">
          {(['forYou', 'following'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3.5 text-sm font-semibold transition-all duration-200 cursor-pointer relative text-center flex flex-col items-center justify-center"
              >
                <span className={`${isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab === 'forYou' ? 'For you' : 'Following'}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-12 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'forYou' ? (
        <PostFeed
          posts={fyfPosts}
          isLoadingInitial={fyfLoading}
          isLoadingMore={fyfLoadingMore}
          hasMore={fyfHasMore}
          isEmpty={fyfEmpty}
          loadMore={fyfLoadMore}
          variant="flat"
        />
      ) : (
        <PostFeed
          posts={followingPosts}
          isLoadingInitial={followingLoading}
          isLoadingMore={followingLoadingMore}
          hasMore={followingHasMore}
          isEmpty={followingEmpty}
          loadMore={followingLoadMore}
          variant="flat"
        />
      )}

      {/* Floating Action Button (FAB) on mobile */}
      {currentUser && (
        <Link
          href="/create"
          className="lg:hidden fixed bottom-20 right-4 z-50 bg-accent text-white p-4 rounded-full shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          aria-label="Create new post"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Link>
      )}
    </div>
  );
}


