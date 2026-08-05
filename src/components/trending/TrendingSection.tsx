'use client';

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Flame, Clock } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import UserAvatar from '../user/UserAvatar';
import FeedImage from '../post/FeedImage';
import { formatDistanceToNow } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

const fetcher = (url: string) => fetchWithAuth(url).then(res => res.json());

interface TrendingArticle {
  _id: string;
  title: string;
  body: string;
  uniqueViews: number;
  avgReadTimeSeconds: number;
  createdAt: string;
  mediaUrls: string[];
  tags: string[];
  author: { _id: string; name: string; username: string; avatar?: string };
  field: { _id: string; name: string; slug: string };
}

export default function TrendingSection() {
  const { data, isLoading } = useSWR('/api/feed/trending', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const articles: TrendingArticle[] = data?.data?.trending?.articles || [];

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-3">
        <div className="space-y-0.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-52 w-48 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) return null;

  return (
    <div className="py-4 px-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <h2 className="text-base font-bold text-foreground">Trending</h2>
          </div>
          <p className="text-xs text-muted-foreground">Discover trending articles and stories for this week</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {articles.map((article) => (
          <Link
            key={article._id}
            href={`/post/${article._id}`}
            className="w-56 shrink-0 snap-start rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all duration-200 overflow-hidden group"
          >
            {article.mediaUrls.length > 0 && (
              <div className="h-28 overflow-hidden">
                <FeedImage
                  src={article.mediaUrls[0]}
                  alt={article.title}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-3 space-y-2">
              {article.field && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {article.field.name}
                </span>
              )}
              <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                {article.title}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <UserAvatar avatar={article.author.avatar} name={article.author.name} size="xs" />
                  <span className="truncate max-w-[80px]">{article.author.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {article.avgReadTimeSeconds > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.round(article.avgReadTimeSeconds / 60)}m read
                  </span>
                )}
                <span>{formatDistanceToNow(article.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
