'use client';

/**
 * @file usePushNotifications.ts
 * @description Hook to manage browser push notification subscriptions.
 */

import { useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { urlBase64ToUint8Array } from '../lib/push';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications not supported in this browser.');
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permission denied for notifications.');
        setLoading(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error('VAPID key not found');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      if (!accessToken) throw new Error('Not authenticated');

      const res = await api.post('/api/users/push-subscription', subscription, accessToken);
      
      if (res.ok) {
        toast.success('Push notifications enabled!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  return { enablePush, loading };
};
