'use client';

/**
 * @file usePushEnable.ts
 * @description Device-aware push-notification enablement state + actions.
 *
 * Single source of truth for the push flow used by the NotificationEnableBanner
 * and the settings notifications page. Every registration carries a stable
 * `deviceId` + `platform` so the backend can track per-device subscriptions
 * (web, Android, iOS) and only prompt for THIS device.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchWithAuth } from '../lib/api';
import { track } from '../lib/analytics';
import {
  urlBase64ToUint8Array,
  keysEqual,
  getDeviceId,
  getPushPlatform,
} from '../lib/push';

export type PushEnableStatus =
  | 'unsupported' // browser can't do push at all
  | 'checking' // querying backend for this device's registration
  | 'prompt' // eligible: not enabled on this device, not denied
  | 'denied' // permission permanently blocked (or rejected this time)
  | 'enabled' // this device has an active registration
  | 'loading' // enable/disable in flight
  | 'error'; // last action failed; message carries details

export interface PushEnableState {
  status: PushEnableStatus;
  message?: string;
}

const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(window.location.href);
};

export const usePushEnable = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const deviceId = getDeviceId();
  const platform = getPushPlatform();

  const [state, setState] = useState<PushEnableState>({ status: 'checking' });

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/users/me', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data.user);
      }
    } catch {
      // best effort — status is derived from push-status next time
    }
  }, [setUser]);

  /** (Re)subscribe the browser to the current VAPID key and persist it for THIS device. */
  const persistSubscription = useCallback(async () => {
    const registration = await navigator.serviceWorker.register('/serwist/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error('VAPID key not configured');
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    // If the existing subscription is bound to a rotated VAPID key, the
    // backend will reject it (400/403). Drop it and re-subscribe fresh.
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const existingKey = subscription.options?.applicationServerKey;
      const existingBytes = existingKey ? new Uint8Array(existingKey) : null;
      const keyMismatch = !existingBytes || !keysEqual(existingBytes, applicationServerKey);
      if (keyMismatch) {
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const res = await fetchWithAuth('/api/users/push-subscription', {
      method: 'POST',
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        deviceId,
        platform,
      }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData?.message || 'Failed to save subscription');
    }
  }, [deviceId, platform]);

  /** Determine whether THIS device currently has push enabled. */
  const checkStatus = useCallback(async () => {
    if (!user || typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }
    if (!isSecureContext()) {
      setState({ status: 'unsupported' });
      return;
    }
    if (Notification.permission === 'denied') {
      setState({ status: 'denied' });
      return;
    }

    setState({ status: 'checking' });
    try {
      const res = await fetchWithAuth(
        `/api/users/push-status?deviceId=${encodeURIComponent(deviceId)}`,
        { method: 'GET' }
      );
      if (res.ok) {
        const data = await res.json();
        const registered = data?.data?.registered === true;
        if (!registered) {
          // Self-heal: the server has no record for this device but the browser
          // still holds a valid subscription (e.g. the record was cleared after
          // a stale-sub rejection). Re-persist it instead of silently showing
          // the enable prompt again.
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (sub) {
            try {
              await persistSubscription();
              await refreshUser();
              setState({ status: 'enabled' });
              return;
            } catch {
              // fall through to prompt
            }
          }
        }
        setState(registered ? { status: 'enabled' } : { status: 'prompt' });
        return;
      }
    } catch {
      // fall through to local permission check
    }
    // Backend unreachable/error: fall back to the local subscription.
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setState(sub ? { status: 'enabled' } : { status: 'prompt' });
  }, [user, deviceId, persistSubscription, refreshUser]);

  useEffect(() => {
    if (!user) return;
    // Deferred so the initial sync setState happens outside the effect body.
    const id = window.setTimeout(() => checkStatus(), 0);
    return () => window.clearTimeout(id);
  }, [user, checkStatus]);

  /** Full enable flow: request permission, (re)subscribe, persist, enable. */
  const enable = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      if (!('Notification' in window)) throw new Error('This browser does not support notifications');
      if (!('serviceWorker' in navigator)) throw new Error('This browser does not support service workers');
      if (!isSecureContext()) throw new Error('Service workers require a secure (https) connection');

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          track({ event: 'push_permission_denied' });
          setState({ status: 'denied' });
          return;
        }
        track({ event: 'push_permission_granted' });
      }

      await persistSubscription();

      await fetchWithAuth('/api/users/me/notifications', {
        method: 'PUT',
        body: JSON.stringify({ pushEnabled: true }),
      });

      await refreshUser();
      setState({ status: 'enabled' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: 'error', message });
    }
  }, [persistSubscription, refreshUser]);

  /** Disable push for THIS device (keeps other devices enabled). */
  const disable = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      await fetchWithAuth('/api/users/push-subscription', {
        method: 'DELETE',
        body: JSON.stringify({ deviceId }),
      });

      // No PUT pushEnabled:false here — the backend recomputes pushEnabled from
      // remaining devices after the DELETE, so other devices stay enabled.
      await refreshUser();
      setState({ status: 'prompt' });
    } catch {
      setState({ status: 'error', message: 'Failed to disable notifications' });
    }
  }, [deviceId, refreshUser]);

  return { state, deviceId, platform, checkStatus, enable, disable };
};
