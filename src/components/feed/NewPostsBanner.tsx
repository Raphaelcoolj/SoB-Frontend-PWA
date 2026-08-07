'use client';

/**
 * @file NewPostsBanner.tsx
 * @description Realtime "New posts" affordance (item 3). Mobile-first, centered near the
 * top of the screen, tinted with the active accent color. Shown ONLY when the server
 * reports >= 10 fresh posts from the user's priority fields within the last 4 hours
 * (`GET /api/feed/fyf/meta?since=`). After the user taps it, it is suppressed for at
 * least 5 minutes even if new content keeps landing. The socket `feed:new_posts` event
 * is just a cheap wake-up signal — it re-checks the server count instead of showing
 * directly, so a single stray post never triggers the banner.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Minimum number of fresh priority-field posts required to surface the banner.
const MIN_NEW_POSTS = 10;
// After the user taps the banner, suppress it again for at least this long.
const COOLDOWN_MS = 5 * 60 * 1000;

interface NewPostsBannerProps {
  /** createdAt of the newest currently-served post; used as the "seen up to" baseline. */
  newestCreatedAt?: string | null;
  /** Called when the user taps the banner (triggers a feed refresh). */
  onRefresh: () => void;
}

export default function NewPostsBanner({ newestCreatedAt, onRefresh }: NewPostsBannerProps) {
  const { accessToken } = useAuthStore();
  const sinceRef = useRef<string | null | undefined>(newestCreatedAt);
  // Once the user taps the banner it is suppressed for COOLDOWN_MS (the timeout
  // below re-enables it), even if the server keeps reporting fresh content.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    sinceRef.current = newestCreatedAt;
  }, [newestCreatedAt]);

  const metaUrl =
    accessToken && newestCreatedAt
      ? `${BASE_URL}/api/feed/fyf/meta?since=${encodeURIComponent(newestCreatedAt)}`
      : null;
  const { data, mutate } = useSWR(
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

  // Realtime signal from the backend when content is published → re-check the
  // server count (which enforces the >=10 priority-field / 4h gate) rather than
  // trusting the event alone.
  useEffect(() => {
    const handler = () => {
      if (sinceRef.current) mutate();
    };
    socket.on('feed:new_posts', handler);
    return () => {
      socket.off('feed:new_posts', handler);
    };
  }, [mutate]);

  useEffect(() => {
    if (!dismissed) return;
    const t = setTimeout(() => setDismissed(false), COOLDOWN_MS);
    return () => clearTimeout(t);
  }, [dismissed]);

  const visible = !!data && data.count >= MIN_NEW_POSTS && !dismissed;

  const handleTap = useCallback(() => {
    onRefresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setDismissed(true);
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
