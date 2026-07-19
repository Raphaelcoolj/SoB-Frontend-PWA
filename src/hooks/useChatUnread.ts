'use client';

import useSWR from 'swr';
import { fetchWithAuth } from '../lib/api';

const BASE = process.env.NEXT_PUBLIC_API_URL;

const fetcher = (url: string) =>
  fetchWithAuth(url, { method: 'GET' }).then((r) => r.json()).then((d) => d.data);

export function useChatUnread() {
  const { data } = useSWR<{ unreadCount: number }>(
    `${BASE}/api/chats/unread`,
    fetcher,
    { refreshInterval: 10000 }
  );

  return data?.unreadCount || 0;
}
