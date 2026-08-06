'use client';

/**
 * @file NewPostsBanner.tsx
 * @description Realtime "New posts" affordance (item 3). Mobile-first, centered near the
 * top of the screen, tinted with the active accent color. Shown when new published content
 * is announced via the `feed:new_posts` socket event OR detected by occasional polling of
 * `/api/feed/fyf/meta?since=`. Tap refreshes the feed and hides the banner.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface NewPostsBannerProps {
  /** createdAt of the newest currently-served post; used as the "seen up to" baseline. */
  newestCreatedAt?: string | null;
  /** Called when the user taps the banner (triggers a feed refresh). */
  onRefresh: () => void;
}

export default function NewPostsBanner({ newestCreatedAt, onRefresh }: NewPostsBannerProps) {
  const { accessToken } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const sinceRef = useRef<string | null | undefined>(newestCreatedAt);

  useEffect(() => {
    sinceRef.current = newestCreatedAt;
  }, [newestCreatedAt]);

  // Realtime signal from backend when content is published.
  useEffect(() => {
    const handler = () => {
      if (sinceRef.current) setVisible(true);
    };
    socket.on('feed:new_posts', handler);
    return () => {
      socket.off('feed:new_posts', handler);
    };
  }, []);

  // Poll fallback for when the socket isn't connected (e.g. transient disconnect).
  const metaUrl =
    accessToken && newestCreatedAt
      ? `${BASE_URL}/api/feed/fyf/meta?since=${encodeURIComponent(newestCreatedAt)}`
      : null;
  const { data } = useSWR(
    metaUrl,
    async (url: string) => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to check for new posts');
      return json.data as { count: number };
    },
    { refreshInterval: 300000, dedupingInterval: 60000, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (data && data.count > 0) setVisible(true);
  }, [data]);

  const handleTap = useCallback(() => {
    onRefresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setVisible(false);
  }, [onRefresh]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="Refresh to see new posts"
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-accent/30 hover:opacity-95 active:scale-95 transition-all animate-fade-in"
    >
      New posts
    </button>
  );
}