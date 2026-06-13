'use client';

/**
 * @file SearchResults.tsx
 * @description Displays search results split into Users and Posts sections.
 * Used in the /search page.
 */

import React from 'react';
import UserCard from '../user/UserCard';
import PostCard from '../post/PostCard';
import ArticleCard from '../post/ArticleCard';
import { Skeleton } from '../ui/Skeleton';

interface SearchResultsProps {
  query: string;
  users: any[];
  posts: any[];
  isLoading: boolean;
}

export default function SearchResults({ query, users, posts, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <section className="space-y-4">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <div className="grid gap-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        </section>
        <section className="space-y-4">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <div className="grid gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
        </section>
      </div>
    );
  }

  if (!query) return null;

  const hasResults = users.length > 0 || posts.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">🔍</div>
        <h3 className="font-medium text-foreground">No results found</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          We couldn't find anything matching "{query}". Try different keywords.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in slide-in-from-bottom-2 duration-500">
      {/* Users Section */}
      {users.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Users</h2>
            <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {users.length} found
            </span>
          </div>
          <div className="grid gap-3">
            {users.map((u) => (
              <UserCard key={u._id} user={u} />
            ))}
          </div>
        </section>
      )}

      {/* Posts Section */}
      {posts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Content</h2>
            <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {posts.length} found
            </span>
          </div>
          <div className="grid gap-4">
            {posts.map((post) => {
              if (post.contentType === 'article') {
                return <ArticleCard key={post._id} article={post} />;
              }
              return <PostCard key={post._id} post={post} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}

