/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist } from "serwist";
import { NetworkOnly } from "serwist";
import { defaultCache } from "@serwist/turbopack/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// HLS manifests + segments must bypass the cross-origin NetworkFirst cache.
// Caching .m3u8/.ts with a 10s network timeout causes buffering / stale
// playback — streams are short-lived and must always hit the network.
const muxStreamRule: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "stream.mux.com",
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [muxStreamRule, ...defaultCache],
});

serwist.addEventListeners();

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'SoB Notification', {
      body: data.body || 'You have a new update!',
      icon: '/favicon-32x32.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url || '/home';
  event.waitUntil(
    self.clients.openWindow(url)
  );
});

// When the browser invalidates/rotates the push subscription (expiry, key
// change, permission churn), re-subscribe under the same applicationServerKey
// and notify open clients so they can persist the new subscription to the
// backend (the SW itself has no JWT).
self.addEventListener('pushsubscriptionchange', (event: PushSubscriptionChangeEvent) => {
  event.waitUntil(
    (async () => {
      try {
        const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          ...(applicationServerKey ? { applicationServerKey } : {}),
        });

        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: subscription.toJSON(),
          });
        }
      } catch (error) {
        console.error('pushsubscriptionchange: re-subscribe failed', error);
      }
    })()
  );
});
