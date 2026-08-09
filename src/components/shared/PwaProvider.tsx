'use client';

/**
 * @file PwaProvider.tsx
 * @description Client wrapper around @serwist's SerwistProvider that only
 * registers the service worker in contexts that actually support it.
 *
 * Service worker registration requires a secure context (`https:` or
 * `http://localhost`). In non-secure contexts — custom `app://` schemes used
 * by in-app browsers/WebView wrappers, `file://`, sandboxed frames, or plain
 * `http://` on a LAN IP — `navigator.serviceWorker.register()` rejects, and
 * Serwist re-throws that rejection with no catch, surfacing as an unhandled
 * "Error: Rejected". This wrapper detects that up front and skips registration
 * entirely (the app still works; it just isn't installable/offline-capable).
 *
 * The two branches produce identical DOM (SerwistProvider only adds a React
 * context), so there is no hydration mismatch.
 */

import React, { useEffect } from 'react';
import { SerwistProvider } from '@serwist/turbopack/react';
import { fetchWithAuth } from '../../lib/api';
import { getDeviceId, getPushPlatform } from '../../lib/push';

const canRegisterServiceWorker = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (window.isSecureContext) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(window.location.href);
};

// When the service worker re-subscribes after a pushsubscriptionchange event,
// persist the fresh subscription to the backend so push keeps working.
const usePushSubscriptionChangeSync = () => {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const onMessage = async (event: MessageEvent) => {
      const data = event.data as { type?: string; subscription?: PushSubscriptionJSON } | undefined;
      if (!data || data.type !== 'PUSH_SUBSCRIPTION_CHANGED' || !data.subscription) return;

      try {
        await fetchWithAuth('/api/users/push-subscription', {
          method: 'POST',
          body: JSON.stringify({
            subscription: data.subscription,
            deviceId: getDeviceId(),
            platform: getPushPlatform(),
          }),
        });
      } catch (error) {
        console.error('Failed to sync re-subscribed push subscription:', error);
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
};

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  usePushSubscriptionChangeSync();
  if (!canRegisterServiceWorker()) return <>{children}</>;
  return <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>;
}
