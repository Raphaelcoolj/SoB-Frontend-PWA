// Legacy service worker (orphaned — live SW is src/sw.ts → /serwist/sw.js).
// Kept in sync so any stale registration still behaves the same.
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};

  const notificationData = {
    url: data.url,
    ...(data.data && typeof data.data === 'object' ? data.data : {}),
  };

  self.registration.showNotification(data.title || 'SoB Notification', {
    body: data.body || 'You have a new update!',
    icon: '/favicon-32x32.png',
    data: notificationData,
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/home';

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          try {
            if ('navigate' in client) {
              await client.navigate(url);
              return;
            }
          } catch {
            /* fall through to openWindow */
          }
          if (new URL(client.url).pathname === new URL(url, self.location.origin).pathname) {
            return;
          }
          break;
        }
      }
      await clients.openWindow(url);
    })()
  );
});
