/**
 * @file useNotifications.ts
 * @description Hook for loading, reading, and clearing notifications from the backend.
 * Syncs initial notification data from /api/notifications into the Zustand store.
 * Listens to real-time updates via socket events (handled in useSocket).
 */

import useSWR from 'swr';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { fetchWithAuth } from '../lib/api';
import { Notification } from '../types/notification';

const createFetcher = (token: string) => async (url: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch notifications');
  return json.data;
};

export const useNotifications = () => {
  const { accessToken } = useAuthStore();
  const { setNotifications, markAllRead } = useNotificationStore();

  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? `${process.env.NEXT_PUBLIC_API_URL}/api/notifications` : null,
    accessToken ? createFetcher(accessToken) : null,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  // Load fetched notifications into the store
  useEffect(() => {
    if (data?.notifications) {
      setNotifications(data.notifications as Notification[]);
    }
  }, [data, setNotifications]);

  /**
   * Marks all notifications as read — calls backend then updates the store.
   */
  const markAllAsRead = async () => {
    if (!accessToken) return;
    try {
      await fetchWithAuth('/api/notifications/read-all', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      markAllRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  /**
   * Marks a single notification as read.
   */
  const markAsRead = async (notificationId: string) => {
    if (!accessToken) return;
    try {
      await fetchWithAuth(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return {
    isLoading,
    error,
    markAllAsRead,
    markAsRead,
    refresh: () => mutate(),
  };
};
