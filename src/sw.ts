/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/turbopack/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data ? event.data.json() : {};

  self.registration.showNotification(data.title || 'SoB Notification', {
    body: data.body || 'You have a new update!',
    icon: '/favicon-32x32.png',
    data: { url: data.url },
  });
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url || '/home';
  event.waitUntil(
    self.clients.openWindow(url)
  );
});
