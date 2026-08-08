/**
 * @file useHomepage.ts
 * @description SWR hook for the public homepage aggregate (GET /api/homepage).
 * Uses a plain public fetch (no auth token) and refreshes every 60s.
 * Accepts the data already fetched during SSR/ISR as `initialData`, which is
 * passed to SWR as `fallbackData` so the server HTML hydrates instantly with
 * real content and the client keeps it as a baseline while revalidating.
 */

import useSWR from 'swr';
import type { HomepageData } from '../types/homepage';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const fetcher = async (url: string): Promise<HomepageData> => {
  const res = await fetch(`${BASE_URL || ''}${url}`, {
    headers: { Accept: 'application/json' },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to load live SoB content');
  }
  return (json?.data as HomepageData) ?? { posts: [], topics: [], discussions: [], users: [] };
};

export const useHomepage = (initialData?: HomepageData) =>
  useSWR<HomepageData>('/api/homepage', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    refreshInterval: 60000,
    keepPreviousData: true,
    fallbackData: initialData,
  });
