self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  // Pass the entire payload as 'data' so it's available in the click event
  self.registration.showNotification(data.title || 'SoB Notification', {
    body: data.body || 'You have a new update!',
    icon: '/favicon-32x32.png',
    data: { url: data.url } // Store the URL here
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close(); // Close the notification

  // Get the URL from the notification data
  const url = event.notification.data?.url || '/home';

  // Open the window
  event.waitUntil(
    clients.openWindow(url)
  );
});
