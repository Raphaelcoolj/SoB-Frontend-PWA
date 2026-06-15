/**
 * @file useDiscoverFeed.ts
 * @description SWR-powered infinite scroll discovery feed hook for a specific field.
 */

import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { fetchWithAuth } from '../lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface FeedPage {
  posts: import('../types/post').Post[];
  nextCursor: number | null;
  hasMore: boolean;
}

const fetcher = async (url: string): Promise<FeedPage> => {
  const endpoint = url.replace(BASE_URL || '', '');
  const res = await fetchWithAuth(endpoint);
  
  const json = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(json.message || 'Failed to fetch discover feed');
  }
  
  // Unwrap the 'data' property from the backend API response
  return json.data as FeedPage;
};

export const useDiscoverFeed = (fieldId: string | null) => {
  // NEW: Generate a stable seed for this session to ensure consistent shuffling across pages
  const seed = useMemo(() => Math.random().toString(36).substring(7), [fieldId]);

  const getKey = (pageIndex: number, previousPageData: FeedPage | null) => {
    if (!fieldId) return null;
    if (previousPageData && previousPageData.nextCursor === null) return null;

    const cursor = previousPageData ? previousPageData.nextCursor : 0;
    return `${BASE_URL}/api/feed/discover/${fieldId}?cursor=${cursor}&seed=${seed}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<FeedPage>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    }
  );

  const posts = data ? data.flatMap((page) => page?.posts || []) : [];
  const isLoadingInitial = !data && !error;
  const isLoadingMore = isValidating && size > 1;
  
  // Robust check for empty feed
  const isEmpty = data && data.length > 0 && Array.isArray(data[0].posts) && data[0].posts.length === 0;
  
  // Robust check for more pages
  const lastPage = data && data.length > 0 ? data[data.length - 1] : null;
  const hasMore = !!lastPage && lastPage.nextCursor !== null;

  return {
    posts,
    isLoadingInitial,
    isLoadingMore,
    isEmpty: !!isEmpty,
    hasMore,
    error,
    loadMore: () => setSize((s) => s + 1),
    refresh: () => mutate(),
  };
};
