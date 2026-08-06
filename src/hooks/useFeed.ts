/**
 * @file useFeed.ts
 * @description SWR-powered infinite scroll feed hook.
 * Fetches posts page by page using cursor-based pagination from the backend FYF feed endpoint.
 * Supports feed type filtering: 'all' | 'articles' | 'posts' via contentType query param.
 */

import useSWRInfinite from 'swr/infinite';
import { useAuthStore } from '../store/authStore';
import { useState, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type FeedType = 'all' | 'articles' | 'posts';

interface FeedPage {
  posts: import('../types/post').Post[];
  nextCursor: number | null;
  hasMore: boolean;
}

/**
 * Fetcher that passes the Authorization header for protected FYF endpoint.
 */
const createFetcher = (token: string) => async (url: string): Promise<FeedPage> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch feed');
  return json.data;
};

export const useFeed = (feedType: FeedType = 'all') => {
  const { accessToken } = useAuthStore();
  // Bumping this nonce changes every page key, so a refresh bypasses SWR's
  // in-memory cache/dedup window and re-fetches page 0 from the network
  // (the backend already invalidates its fyf:* page cache on publish).
  const [refreshNonce, setRefreshNonce] = useState(0);

  const getKey = (pageIndex: number, previousPageData: FeedPage | null) => {
    // Stop fetching if there's no more data
    if (previousPageData && !previousPageData.nextCursor) return null;
    if (!accessToken) return null;

    const cursor = previousPageData ? previousPageData.nextCursor : 0;
    const params = new URLSearchParams({
      cursor: String(cursor),
    });

    // Apply content type filter
    if (feedType !== 'all') {
      params.set('type', feedType === 'articles' ? 'article' : 'post');
    }

    // Cache-busting nonce: forces a genuinely fresh fetch on manual refresh
    if (refreshNonce > 0) params.set('bust', String(refreshNonce));

    return `${BASE_URL}/api/feed/fyf?${params.toString()}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<FeedPage>(
    getKey,
    accessToken ? createFetcher(accessToken) : () => Promise.resolve({ posts: [], nextCursor: null, hasMore: false }),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const posts = data
    ? [...new Map(data.flatMap((page) => page.posts).map((p) => [p._id, p])).values()]
    : [];
  const isLoadingInitial = !data && !error;
  const isLoadingMore = isValidating && size > 1;
  const isEmpty = data?.[0]?.posts.length === 0;
  const hasMore = !!data?.[data.length - 1]?.nextCursor;

  const refresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
    setSize(1);
  }, [setSize]);

  return {
    posts,
    isLoadingInitial,
    isLoadingMore,
    isEmpty,
    hasMore,
    error,
    loadMore: () => setSize((s) => s + 1),
    refresh,
  };
};
