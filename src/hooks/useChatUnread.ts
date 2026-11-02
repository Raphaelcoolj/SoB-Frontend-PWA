'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetchWithAuth } from '../lib/api';
import { socket } from '../lib/socket';
import { useSocketConnected } from './useSocketConnected';

const BASE = process.env.NEXT_PUBLIC_API_URL;
const UNREAD_KEY = `${BASE}/api/chats/unread`;

const fetcher = (url: string) =>
  fetchWithAuth(url, { method: 'GET' }).then((r) => r.json()).then((d) => d.data);

/**
 * Revalidate the shared unread badge outside of the hook (e.g. right after a
 * conversation is marked read) so the count drops without waiting for a poll.
 */
export function mutateChatUnread(): Promise<unknown> {
  return globalMutate(UNREAD_KEY);
}

export function useChatUnread() {
  const socketHealthy = useSocketConnected();
  const { data, mutate } = useSWR<{ unreadCount: number }>(UNREAD_KEY, fetcher, {
    // The socket event below is the primary trigger; polling is only a
    // reconnect safety net, so it is suspended while realtime is healthy.
    refreshInterval: socketHealthy ? 0 : 10000,
    dedupingInterval: 10000,
  });

  useEffect(() => {
    if (!socketHealthy) return;
    const onMessage = () => { mutate(); };
    socket.on('chat:message', onMessage);
    return () => { socket.off('chat:message', onMessage); };
  }, [socketHealthy, mutate]);

  return data?.unreadCount || 0;
}
