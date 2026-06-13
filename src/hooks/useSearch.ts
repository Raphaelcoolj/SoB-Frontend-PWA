/**
 * @file useSearch.ts
 * @description Debounced search hook for querying users and posts simultaneously.
 * Uses SWR for caching and deduplication. Both searches run in parallel.
 */

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { Post } from '../types/post';
import { User } from '../types/user';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Search failed');
  return json.data;
};

export const useSearch = (rawQuery: string) => {
  // Debounce 300ms before triggering SWR requests
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const shouldFetch = debouncedQuery.length >= 1;

  const { data: postData, isLoading: postsLoading } = useSWR(
    shouldFetch ? `${BASE_URL}/api/search/posts?q=${encodeURIComponent(debouncedQuery)}&limit=8` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const { data: userData, isLoading: usersLoading } = useSWR(
    shouldFetch ? `${BASE_URL}/api/search/users?q=${encodeURIComponent(debouncedQuery)}&limit=5` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  return {
    posts: (postData?.posts || []) as Post[],
    users: (userData?.users || []) as User[],
    isLoading: postsLoading || usersLoading,
    hasQuery: shouldFetch,
  };
};
