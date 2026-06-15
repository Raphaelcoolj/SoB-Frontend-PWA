/**
 * @file useDiscoverFeed.ts
 * @description SWR-powered infinite scroll discovery feed hook for a specific field.
 */

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
  
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Failed to fetch discover feed');
  }
  
  const json = await res.json();
  return json.data;
};

export const useDiscoverFeed = (fieldId: string | null) => {
  const getKey = (pageIndex: number, previousPageData: FeedPage | null) => {
    if (!fieldId) return null;
    if (previousPageData && !previousPageData.nextCursor) return null;

    const cursor = previousPageData ? previousPageData.nextCursor : 0;
    return `${BASE_URL}/api/feed/discover/${fieldId}?cursor=${cursor}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<FeedPage>(
    getKey,
    fetcher,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    }
  );

  const posts = data ? data.flatMap((page) => page.posts) : [];
  const isLoadingInitial = !data && !error;
  const isLoadingMore = isValidating && size > 1;
  const isEmpty = data?.[0]?.posts.length === 0;
  const hasMore = !!data?.[data.length - 1]?.nextCursor;

  return {
    posts,
    isLoadingInitial,
    isLoadingMore,
    isEmpty,
    hasMore,
    error,
    loadMore: () => setSize((s) => s + 1),
    refresh: () => mutate(),
  };
};
