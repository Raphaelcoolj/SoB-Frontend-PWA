/**
 * @file useSearch.ts
 * @description Search hook for querying users and posts simultaneously.
 * Uses SWR for caching and deduplication. Both searches run in parallel.
 */

import useSWR from 'swr';
import { Post } from '../types/post';
import { User } from '../types/user';
import { fetchWithAuth } from '../lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string) => {
  // Remote log: Fetch start
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debug/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `[DEBUG] useSearch fetching: ${url}` }),
  }).catch(() => {});

  try {
    const res = await fetchWithAuth(url);
    const json = await res.json();
    
    // Remote log: Success
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debug/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `[DEBUG] useSearch API success` }),
    }).catch(() => {});
    
    if (!res.ok) throw new Error(json.message || 'Search failed');
    return json.data;
  } catch (error) {
    // Remote log: Failure
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debug/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `[DEBUG] useSearch API ERROR: ${error}` }),
    }).catch(() => {});
    throw error;
  }
};

export const useSearch = (debouncedQuery: string) => {
  const trimmedQuery = debouncedQuery.trim();
  const shouldFetch = trimmedQuery.length >= 1;

  const { data: postData, isLoading: postsLoading } = useSWR(
    shouldFetch ? `${BASE_URL}/api/search/posts?q=${encodeURIComponent(trimmedQuery)}&limit=8` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const { data: userData, isLoading: usersLoading } = useSWR(
    shouldFetch ? `${BASE_URL}/api/search/users?q=${encodeURIComponent(trimmedQuery)}&limit=5` : null,
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
