'use client';

/**
 * @file page.tsx (bookmarks)
 * @description List of bookmarked posts with infinite scroll.
 */

import React from 'react';
import useSWRInfinite from 'swr/infinite';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import PostCard from '../../../components/post/PostCard';
import ArticleCard from '../../../components/post/ArticleCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useInView } from 'react-intersection-observer';

const PAGE_SIZE = 10;

// The backend response format is: 
// { success: true, message: "...", data: { posts: [] }, meta: { total: number, page: number, limit: number } }
interface BookmarkResponse {
  data: {
    posts: any[];
  };
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

const fetcher = async (url: string, token: string): Promise<BookmarkResponse> => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  
  if (res.status === 401) {
      // Potentially trigger token refresh here
      throw new Error('TOKEN_EXPIRED');
  }
  
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  return res.json();
};

export default function BookmarksListPage() {
  const { accessToken } = useAuthStore();
  const { ref, inView } = useInView();

  const getKey = (pageIndex: number, previousPageData: BookmarkResponse | null) => {
    if (!accessToken) return null;
    
    // Check if there are no more pages
    if (previousPageData && (previousPageData.data.posts.length === 0 || previousPageData.data.posts.length < PAGE_SIZE)) {
        return null;
    }
    
    return `${process.env.NEXT_PUBLIC_API_URL}/api/posts/bookmarks?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
  };

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<BookmarkResponse>(
    getKey,
    (url: string) => fetcher(url, accessToken || ''),
    { revalidateFirstPage: false }
  );

  // Safely flatten the posts
  const posts = data ? data.flatMap(page => page.data.posts) : [];
  
  // Calculate if we reached the end
  const totalAvailable = data?.[data.length - 1]?.meta?.total || 0;
  const isReachingEnd = posts.length >= totalAvailable;

  React.useEffect(() => {
    if (inView && !isReachingEnd && !isLoading && !isValidating) {
      setSize(size + 1);
    }
  }, [inView, isReachingEnd, isLoading, isValidating, size, setSize]);

  return (
    <div className="space-y-4 pt-4">
      <h1 className="text-lg font-semibold text-foreground">Bookmarks</h1>

      {isLoading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {posts.map((post: any) => (
            post.contentType === 'article' ? 
              <ArticleCard key={post._id} article={post} /> :
              <PostCard key={post._id} post={post} />
          ))}
          
          {posts.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground">
              No bookmarks yet.
            </div>
          )}

          {!isReachingEnd && (
            <div ref={ref} className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
