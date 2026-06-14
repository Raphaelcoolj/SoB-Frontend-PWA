/**
 * @file useDiscoverFeed.ts
 * @description SWR-powered infinite scroll discovery feed hook for a specific field.
 */

import useSWRInfinite from 'swr/infinite';
import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface FeedPage {
  posts: import('../types/post').Post[];
  nextCursor: number | null;
  hasMore: boolean;
}

const createFetcher = (token: string) => async (url: string): Promise<FeedPage> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch discover feed');
  return json.data;
};

export const useDiscoverFeed = (fieldId: string | null) => {
  const { accessToken } = useAuthStore();

  const getKey = (pageIndex: number, previousPageData: FeedPage | null) => {
    if (!fieldId) return null;
    if (previousPageData && !previousPageData.nextCursor) return null;
    if (!accessToken) return null;

    const cursor = previousPageData ? previousPageData.nextCursor : 0;
    return `${BASE_URL}/api/feed/discover/${fieldId}?cursor=${cursor}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<FeedPage>(
    getKey,
    accessToken ? createFetcher(accessToken) : () => Promise.resolve({ posts: [], nextCursor: null, hasMore: false }),
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
